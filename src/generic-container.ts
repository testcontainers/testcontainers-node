import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { Command, DockerClient, Env, EnvKey, EnvValue, ExecResult } from "./docker-client";
import { DockerClientFactory, DockerodeClientFactory, Host } from "./docker-client-factory";
import log from "./logger";
import { Options, WithArgument } from "./options";
import { Port } from "./port";
import { PortBinder } from "./port-binder";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { Image, RepoTag, Tag } from "./repo-tag";
import { StartedTestContainer, StoppedTestContainer, TestContainer } from "./test-container";
import { RandomUuid, Uuid } from "./uuid";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

export class GenericContainer implements TestContainer {
  public static async fromDockerfile(...options: WithArgument[]): Promise<GenericContainer> {
    let opts: Options = {
      uuid: new RandomUuid(),
      dockerClientFactory: new DockerodeClientFactory() as DockerClientFactory,
      buildArgs: {}
    } as Options;
    for (const opt of options) {
      opts = opt(opts);
    }

    const image = opts.imageName || opts.uuid.nextUuid();
    const tag = opts.imageTag || opts.uuid.nextUuid();
    const repoTag = new RepoTag(image, tag);
    const dockerClient = opts.dockerClientFactory.getClient();
    await dockerClient.buildImage(repoTag, opts);
    const container = new GenericContainer(image, tag);

    // tslint:disable-next-line
    if (!(await container.hasRepoTagLocally())) {
      throw new Error("Failed to build image");
    }

    return Promise.resolve(container);
  }

  private readonly repoTag: RepoTag;
  private readonly dockerClient: DockerClient;

  private env: Env = {};
  private ports: Port[] = [];
  private cmd: Command[] = [];
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
    const container = await this.dockerClient.create(this.repoTag, this.env, boundPorts, this.cmd);
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
    private readonly dockerClient: DockerClient
  ) {}

  public async stop(): Promise<StoppedTestContainer> {
    await this.container.stop();
    await this.container.remove();
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
