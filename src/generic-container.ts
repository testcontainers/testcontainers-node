import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { BuildContext, Command, DockerClient, Env, EnvKey, EnvValue } from "./docker-client";
import { DockerClientFactory, DockerodeClientFactory, Host } from "./docker-client-factory";
import log from "./logger";
import { Port } from "./port";
import { PortBinder } from "./port-binder";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { Image, RepoTag, Tag } from "./repo-tag";
import { StartedTestContainer, StoppedTestContainer, TestContainer } from "./test-container";
import { RandomUuid, Uuid } from "./uuid";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

export class GenericContainer implements TestContainer {

  public static async fromDockerfile(
    context: BuildContext,
    uuid: Uuid = new RandomUuid(),
    dockerClientFactory: DockerClientFactory = new DockerodeClientFactory()
  ): Promise<GenericContainer> {
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
  private waitStrategy?: WaitStrategy;
  private startupTimeout: Duration = new Duration(60_000, TemporalUnit.MILLISECONDS);
  private name?: string;
  private hostName?: string;
  private network?: string;

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
    const container = await this.dockerClient.create(this.repoTag, this.env, boundPorts, this.cmd, this.name, this.network, this.hostName);
    await this.dockerClient.start(container);
    const inspectResult = await container.inspect();
    const containerState = new ContainerState(inspectResult);
    await this.waitForContainer(container, containerState, boundPorts);

    return new StartedGenericContainer(container, this.dockerClient.getHost(), boundPorts);
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

  public withName(name: string): TestContainer {
    this.name = name;
    return this;
  }

  public withNetwork(network: string): TestContainer {
    this.network = network;
    return this;
  }

  public withHostname(hostname: string): TestContainer {
    this.hostName = hostname;
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
    private readonly boundPorts: BoundPorts
  ) {}

  public getId(): string {
    return this.container.getId();
  }

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
}

class StoppedGenericContainer implements StoppedTestContainer {}
