import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import {
  BuildArgs,
  BuildContext,
  Command,
  DockerClient,
  Env,
  EnvKey,
  EnvValue,
  ExecResult,
  TmpFs
} from "./docker-client";
import { DockerClientFactory, DockerodeClientFactory, Host } from "./docker-client-factory";
import log from "./logger";
import { Port } from "./port";
import { PortBinder } from "./port-binder";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { Image, RepoTag, Tag } from "./repo-tag";
import {
  DEFAULT_STOP_OPTIONS,
  OptionalStopOptions,
  StartedTestContainer,
  StoppedTestContainer,
  TestContainer
} from "./test-container";
import { RandomUuid, Uuid } from "./uuid";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

export class GenericContainerBuilder {
  private factory: DockerClientFactory;
  private uuid: Uuid;
  private buildArgs: BuildArgs;
  private imageName: string | null;
  private imageTag: string | null;
  private abortBuildOnExistingImage: boolean;

  constructor(private context: BuildContext) {
    this.factory = new DockerodeClientFactory();
    this.uuid = new RandomUuid();
    this.buildArgs = {};
    this.imageName = null;
    this.imageTag = null;
    this.abortBuildOnExistingImage = false;
  }

  public withDockerClientFactory(factory: DockerClientFactory): GenericContainerBuilder {
    this.factory = factory;
    return this;
  }

  public withUuid(uuid: Uuid): GenericContainerBuilder {
    this.uuid = uuid;
    return this;
  }

  public withBuildArg(key: string, value: string): GenericContainerBuilder {
    this.buildArgs[key] = value;
    return this;
  }

  public withImageName(name: string): GenericContainerBuilder {
    this.imageName = name;
    return this;
  }

  public withImageTag(tag: string): GenericContainerBuilder {
    this.imageTag = tag;
    return this;
  }

  public skipBuildOnExistingImage(): GenericContainerBuilder {
    this.abortBuildOnExistingImage = true;
    return this;
  }

  public async build(): Promise<GenericContainer> {
    const image = this.imageName || this.uuid.nextUuid();
    const tag = this.imageTag || this.uuid.nextUuid();
    const repoTag = new RepoTag(image, tag);
    const dockerClient = this.factory.getClient();
    await dockerClient.buildImage(repoTag, this.context, this.buildArgs, this.abortBuildOnExistingImage);
    const container = new GenericContainer(image, tag);

    if (!(await container.hasRepoTagLocally())) {
      throw new Error("Failed to build image");
    }

    return Promise.resolve(container);
  }
}

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: BuildContext): GenericContainerBuilder {
    return new GenericContainerBuilder(context);
  }

  private readonly repoTag: RepoTag;
  private readonly dockerClient: DockerClient;

  private env: Env = {};
  private ports: Port[] = [];
  private cmd: Command[] = [];
  private tmpFs: TmpFs = {};
  private waitStrategy?: WaitStrategy;
  private startupTimeout: Duration = new Duration(60_000, TemporalUnit.MILLISECONDS);

  constructor(
    readonly image: Image,
    readonly tag: Tag = "latest",
    readonly dockerClientFactory: DockerClientFactory = new DockerodeClientFactory()
  ) {
    this.repoTag = new RepoTag(image, tag);
    this.dockerClient = dockerClientFactory.getClient();
  }

  public async start(): Promise<StartedTestContainer> {
    if (!(await this.hasRepoTagLocally())) {
      await this.dockerClient.pull(this.repoTag);
    }

    const boundPorts = await new PortBinder().bind(this.ports);
    const container = await this.dockerClient.create({
      repoTag: this.repoTag,
      env: this.env,
      cmd: this.cmd,
      tmpFs: this.tmpFs,
      boundPorts
    });
    await this.dockerClient.start(container);
    const inspectResult = await container.inspect();
    const containerState = new ContainerState(inspectResult);
    await this.waitForContainer(container, containerState, boundPorts);

    return new StartedGenericContainer(container, this.dockerClient.getHost(), boundPorts, this.dockerClient);
  }

  public withCmd(cmd: Command[]) {
    this.cmd = cmd;
    return this;
  }

  public withEnv(key: EnvKey, value: EnvValue): TestContainer {
    this.env[key] = value;
    return this;
  }

  public withTmpFs(tmpFs: TmpFs) {
    this.tmpFs = tmpFs;
    return this;
  }

  public withExposedPorts(...ports: Port[]): TestContainer {
    this.ports = ports;
    return this;
  }

  public withStartupTimeout(startupTimeout: Duration): TestContainer {
    this.startupTimeout = startupTimeout;
    return this;
  }

  public withWaitStrategy(waitStrategy: WaitStrategy): TestContainer {
    this.waitStrategy = waitStrategy;
    return this;
  }

  public async hasRepoTagLocally(): Promise<boolean> {
    const repoTags = await this.dockerClient.fetchRepoTags();
    return repoTags.some(repoTag => repoTag.equals(this.repoTag));
  }

  private async waitForContainer(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug("Starting container health checks");
    const waitStrategy = this.getWaitStrategy(container);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
    log.debug("Container health checks complete");
  }

  private getWaitStrategy(container: Container): WaitStrategy {
    if (this.waitStrategy) {
      return this.waitStrategy;
    }
    const hostPortCheck = new HostPortCheck(this.dockerClient.getHost());
    const internalPortCheck = new InternalPortCheck(container, this.dockerClient);
    return new HostPortWaitStrategy(this.dockerClient, hostPortCheck, internalPortCheck);
  }
}

class StartedGenericContainer implements StartedTestContainer {
  constructor(
    private readonly container: Container,
    private readonly host: Host,
    private readonly boundPorts: BoundPorts,
    private readonly dockerClient: DockerClient
  ) {}

  public async stop(options: OptionalStopOptions = {}): Promise<StoppedTestContainer> {
    const resolvedOptions = { ...DEFAULT_STOP_OPTIONS, ...options };
    await this.container.stop({ timeout: resolvedOptions.timeout });
    await this.container.remove({ removeVolumes: resolvedOptions.removeVolumes });
    return new StoppedGenericContainer();
  }

  public getContainerIpAddress(): Host {
    return this.host;
  }

  public getMappedPort(port: Port): Port {
    return this.boundPorts.getBinding(port);
  }

  public exec(command: Command[]): Promise<ExecResult> {
    return this.dockerClient.exec(this.container, command);
  }
}

class StoppedGenericContainer implements StoppedTestContainer {}
