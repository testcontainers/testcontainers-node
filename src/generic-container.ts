import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import {
  BindMode,
  BindMount,
  BuildContext,
  Command,
  ContainerName,
  Dir,
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

export class GenericContainer implements TestContainer {
  public static async fromDockerfile(context: BuildContext): Promise<GenericContainer> {
    const uuid: Uuid = new RandomUuid();
    const dockerClientFactory: DockerClientFactory = new DockerodeClientFactory();

    const image = uuid.nextUuid();
    const tag = uuid.nextUuid();
    const repoTag = new RepoTag(image, tag);
    const dockerClient = dockerClientFactory.getClient();
    await dockerClient.buildImage(repoTag, context);
    const container = new GenericContainer(image, tag);

    return Promise.resolve(container);
  }

  private readonly repoTag: RepoTag;
  private readonly dockerClient: DockerClient;

  private env: Env = {};
  private ports: Port[] = [];
  private cmd: Command[] = [];
  private bindMounts: BindMount[] = [];
  private name?: ContainerName;
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
      bindMounts: this.bindMounts,
      tmpFs: this.tmpFs,
      boundPorts,
      name: this.name
    });
    await this.dockerClient.start(container);
    const inspectResult = await container.inspect();
    const containerState = new ContainerState(inspectResult);
    await this.waitForContainer(container, containerState, boundPorts);

    return new StartedGenericContainer(
      container,
      this.dockerClient.getHost(),
      boundPorts,
      inspectResult.name,
      this.dockerClient
    );
  }

  public withCmd(cmd: Command[]) {
    this.cmd = cmd;
    return this;
  }

  public withName(name: ContainerName) {
    this.name = name;
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

  public withBindMount(source: Dir, target: Dir, bindMode: BindMode = "rw"): TestContainer {
    this.bindMounts.push({ source, target, bindMode });
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

  private async hasRepoTagLocally(): Promise<boolean> {
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
    private readonly name: ContainerName,
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

  public getName(): ContainerName {
    return this.name;
  }

  public exec(command: Command[]): Promise<ExecResult> {
    return this.dockerClient.exec(this.container, command);
  }
}

class StoppedGenericContainer implements StoppedTestContainer {}
