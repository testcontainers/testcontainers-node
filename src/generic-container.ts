import { BoundPorts } from "./bound-ports";
import { Container, Id as ContainerId, InspectResult, NetworkSettings } from "./container";
import { ContainerState } from "./container-state";
import {
  AuthConfig,
  BindMode,
  BindMount,
  BuildArgs,
  BuildContext,
  Command,
  ContainerName,
  Dir,
  DockerClient,
  Env,
  EnvKey,
  EnvValue,
  ExecResult,
  HealthCheck,
  NetworkMode,
  TmpFs,
} from "./docker-client";
import { DockerClientFactory, Host } from "./docker-client-factory";
import { containerLog, log } from "./logger";
import { Port } from "./port";
import { PortBinder } from "./port-binder";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { DefaultPullPolicy, PullPolicy } from "./pull-policy";
import { Image, RepoTag, Tag } from "./repo-tag";
import {
  DEFAULT_STOP_OPTIONS,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
  TestContainer,
} from "./test-container";
import { RandomUuid, Uuid } from "./uuid";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";
import { ReaperInstance } from "./reaper";
import { Readable } from "stream";

export class GenericContainerBuilder {
  private buildArgs: BuildArgs = {};

  constructor(
    private readonly context: BuildContext,
    private readonly dockerfileName: string,
    private readonly uuid: Uuid = new RandomUuid()
  ) {}

  public withBuildArg(key: string, value: string): GenericContainerBuilder {
    this.buildArgs[key] = value;
    return this;
  }

  public async build(): Promise<GenericContainer> {
    const image = this.uuid.nextUuid();
    const tag = this.uuid.nextUuid();

    const repoTag = new RepoTag(image, tag);
    const dockerClient = await DockerClientFactory.getClient();
    await dockerClient.buildImage(repoTag, this.context, this.dockerfileName, this.buildArgs);
    const container = new GenericContainer(image, tag);

    if (!(await container.isImageCached(dockerClient))) {
      throw new Error("Failed to build image");
    }

    return Promise.resolve(container);
  }
}

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: BuildContext, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  private readonly repoTag: RepoTag;

  protected env: Env = {};
  protected networkMode?: NetworkMode;
  protected ports: Port[] = [];
  protected cmd: Command[] = [];
  protected bindMounts: BindMount[] = [];
  protected name?: ContainerName;
  protected tmpFs: TmpFs = {};
  protected healthCheck?: HealthCheck;
  protected waitStrategy?: WaitStrategy;
  protected startupTimeout = 60_000;
  protected useDefaultLogDriver = false;
  protected privilegedMode = false;
  protected daemonMode = false;
  protected authConfig?: AuthConfig;
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();

  constructor(readonly image: Image, readonly tag: Tag = "latest") {
    this.repoTag = new RepoTag(image, tag);
  }

  public async start(): Promise<StartedTestContainer> {
    const dockerClient = await DockerClientFactory.getClient();

    if (this.pullPolicy.shouldPull() || !(await this.isImageCached(dockerClient))) {
      await dockerClient.pull(this.repoTag, this.authConfig);
    }

    const boundPorts = await new PortBinder().bind(this.ports);

    if (!this.repoTag.isReaper()) {
      await ReaperInstance.start(dockerClient);
    }

    if (this.preCreate) {
      await this.preCreate(dockerClient, boundPorts);
    }

    const container = await dockerClient.create({
      repoTag: this.repoTag,
      env: this.env,
      cmd: this.cmd,
      bindMounts: this.bindMounts,
      tmpFs: this.tmpFs,
      boundPorts,
      name: this.name,
      networkMode: this.networkMode,
      healthCheck: this.healthCheck,
      useDefaultLogDriver: this.useDefaultLogDriver,
      privilegedMode: this.privilegedMode,
      autoRemove: this.daemonMode,
    });

    log.info(`Starting container ${this.repoTag} with ID: ${container.getId()}`);
    await dockerClient.start(container);

    if (!this.daemonMode) {
      (await container.logs())
        .on("data", (data) => containerLog.trace(`${container.getId()}: ${data}`))
        .on("err", (data) => containerLog.error(`${container.getId()}: ${data}`));
    }

    const inspectResult = await container.inspect();
    const containerState = new ContainerState(inspectResult);

    await this.waitForContainer(dockerClient, container, containerState, boundPorts);

    return new StartedGenericContainer(
      container,
      dockerClient.getHost(),
      inspectResult,
      boundPorts,
      inspectResult.name,
      dockerClient
    );
  }

  public withAuthentication(authConfig: AuthConfig): this {
    this.authConfig = authConfig;
    return this;
  }

  public withCmd(cmd: Command[]): this {
    this.cmd = cmd;
    return this;
  }

  public withName(name: ContainerName): this {
    this.name = name;
    return this;
  }

  public withEnv(key: EnvKey, value: EnvValue): this {
    this.env[key] = value;
    return this;
  }

  public withTmpFs(tmpFs: TmpFs): this {
    this.tmpFs = tmpFs;
    return this;
  }

  public withNetworkMode(networkMode: NetworkMode): this {
    this.networkMode = networkMode;
    return this;
  }

  public withExposedPorts(...ports: Port[]): this {
    this.ports = ports;
    return this;
  }

  public withBindMount(source: Dir, target: Dir, bindMode: BindMode = "rw"): this {
    this.bindMounts.push({ source, target, bindMode });
    return this;
  }

  public withHealthCheck(healthCheck: HealthCheck): this {
    this.healthCheck = healthCheck;
    return this;
  }

  public withStartupTimeout(startupTimeout: number): this {
    this.startupTimeout = startupTimeout;
    return this;
  }

  public withWaitStrategy(waitStrategy: WaitStrategy): this {
    this.waitStrategy = waitStrategy;
    return this;
  }

  public withDefaultLogDriver(): this {
    this.useDefaultLogDriver = true;
    return this;
  }

  public withPrivilegedMode(): this {
    this.privilegedMode = true;
    return this;
  }

  public withPullPolicy(pullPolicy: PullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public withDaemonMode(): this {
    this.daemonMode = true;
    return this;
  }

  public async isImageCached(dockerClient: DockerClient): Promise<boolean> {
    const repoTags = await dockerClient.fetchRepoTags();
    return repoTags.some((repoTag) => repoTag.equals(this.repoTag));
  }

  protected preCreate?(dockerClient: DockerClient, boundPorts: BoundPorts): Promise<void>;

  private async waitForContainer(
    dockerClient: DockerClient,
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug(`Waiting for container to be ready: ${container.getId()}`);
    const waitStrategy = this.getWaitStrategy(dockerClient, container);

    try {
      await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
      log.info("Container is ready");
    } catch (err) {
      log.error("Container failed to be ready");

      if (this.daemonMode) {
        (await container.logs())
          .on("data", (data) => containerLog.trace(`${container.getId()}: ${data}`))
          .on("err", (data) => containerLog.error(`${container.getId()}: ${data}`));
      }

      try {
        await container.stop({ timeout: 0 });
        await container.remove({ removeVolumes: true });
      } catch (stopErr) {
        log.error("Failed to stop container after it failed to be ready");
      }
      throw err;
    }
  }

  private getWaitStrategy(dockerClient: DockerClient, container: Container): WaitStrategy {
    if (this.waitStrategy) {
      return this.waitStrategy;
    }
    const hostPortCheck = new HostPortCheck(dockerClient.getHost());
    const internalPortCheck = new InternalPortCheck(container, dockerClient);
    return new HostPortWaitStrategy(dockerClient, hostPortCheck, internalPortCheck);
  }
}

export class StartedGenericContainer implements StartedTestContainer {
  constructor(
    private readonly container: Container,
    private readonly host: Host,
    private readonly inspectResult: InspectResult,
    private readonly boundPorts: BoundPorts,
    private readonly name: ContainerName,
    private readonly dockerClient: DockerClient
  ) {}

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return await this.stopContainer(options);
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container with ID: ${this.container.getId()}`);
    const resolvedOptions = { ...DEFAULT_STOP_OPTIONS, ...options };
    await this.container.stop({ timeout: resolvedOptions.timeout });
    await this.container.remove({ removeVolumes: resolvedOptions.removeVolumes });
    return new StoppedGenericContainer();
  }

  public getHost(): Host {
    return this.host;
  }

  public getMappedPort(port: Port): Port {
    return this.boundPorts.getBinding(port);
  }

  public getId(): ContainerId {
    return this.container.getId();
  }

  public getName(): ContainerName {
    return this.name;
  }

  public getIpAddress(networkName: string): string {
    return this.inspectResult.networkSettings[networkName].ipAddress;
  }

  public exec(command: Command[]): Promise<ExecResult> {
    return this.dockerClient.exec(this.container, command);
  }

  public logs(): Promise<Readable> {
    return this.container.logs();
  }
}

class StoppedGenericContainer implements StoppedTestContainer {}
