import archiver from "archiver";
import path from "path";
import { BoundPorts } from "./bound-ports";
import { Container, Id as ContainerId, InspectResult } from "./container";
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
  ExtraHost,
  HealthCheck,
  NetworkMode,
  RegistryConfig,
  TmpFs,
} from "./docker-client";
import { DockerClientInstance, Host } from "./docker-client-instance";
import { containerLog, log } from "./logger";
import { Port } from "./port";
import { PortBinder } from "./port-binder";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { DefaultPullPolicy, PullPolicy } from "./pull-policy";
import { DockerImageName } from "./docker-image-name";
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
import { PortForwarderInstance } from "./port-forwarder";
import { getAuthConfig } from "./registry-auth-locator";
import { getDockerfileImages } from "./dockerfile-parser";

export class GenericContainerBuilder {
  private buildArgs: BuildArgs = {};
  private pullPolicy: PullPolicy = new DefaultPullPolicy();

  constructor(
    private readonly context: BuildContext,
    private readonly dockerfileName: string,
    private readonly uuid: Uuid = new RandomUuid()
  ) {}

  public withBuildArg(key: string, value: string): GenericContainerBuilder {
    this.buildArgs[key] = value;
    return this;
  }

  public withPullPolicy(pullPolicy: PullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public async build(image = `${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`): Promise<GenericContainer> {
    const dockerImageName = DockerImageName.fromString(image);
    const dockerClient = await DockerClientInstance.getInstance();

    await ReaperInstance.getInstance(dockerClient);

    const dockerfile = path.resolve(this.context, this.dockerfileName);
    log.debug(`Preparing to build Dockerfile: ${dockerfile}`);
    const imageNames = await getDockerfileImages(dockerfile);
    const registryConfig = await this.getRegistryConfig(imageNames);

    await dockerClient.buildImage(
      dockerImageName,
      this.context,
      this.dockerfileName,
      this.buildArgs,
      this.pullPolicy,
      registryConfig
    );
    const container = new GenericContainer(dockerImageName.toString());

    if (!(await isImageCached(dockerClient, dockerImageName))) {
      throw new Error("Failed to build image");
    }

    return Promise.resolve(container);
  }

  private async getRegistryConfig(imageNames: DockerImageName[]): Promise<RegistryConfig> {
    const authConfigs: AuthConfig[] = [];

    await Promise.all(
      imageNames.map(async (imageName) => {
        const authConfig = await getAuthConfig(imageName.registry);

        if (authConfig !== undefined) {
          authConfigs.push(authConfig);
        }
      })
    );

    return authConfigs
      .map((authConfig) => {
        return {
          [authConfig.registryAddress]: {
            username: authConfig.username,
            password: authConfig.password,
          },
        };
      })
      .reduce((prev, next) => ({ ...prev, ...next }), {} as RegistryConfig);
  }
}

async function isImageCached(dockerClient: DockerClient, imageName: DockerImageName) {
  const dockerImageNames = await dockerClient.fetchDockerImageNames();
  return dockerImageNames.some((dockerImageName) => dockerImageName.equals(imageName));
}

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: BuildContext, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  private readonly dockerImageName: DockerImageName;

  protected env: Env = {};
  protected networkMode?: NetworkMode;
  protected networkAliases: string[] = [];
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
  protected ipcMode?: string;
  protected user?: string;
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();
  protected tarToCopy?: archiver.Archiver;

  private extraHosts: ExtraHost[] = [];

  constructor(readonly image: string) {
    this.dockerImageName = DockerImageName.fromString(image);
  }

  public async start(): Promise<StartedTestContainer> {
    const dockerClient = await DockerClientInstance.getInstance();

    if (this.pullPolicy.shouldPull() || !(await isImageCached(dockerClient, this.dockerImageName))) {
      const authConfig = await getAuthConfig(this.dockerImageName.registry);
      await dockerClient.pull(this.dockerImageName, authConfig);
    }

    const boundPorts = await new PortBinder().bind(this.ports);

    if (!this.dockerImageName.isReaper()) {
      await ReaperInstance.getInstance(dockerClient);
    }

    if (this.preCreate) {
      await this.preCreate(dockerClient, boundPorts);
    }

    if (!this.dockerImageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance(dockerClient);
      this.extraHosts.push({ host: "host.testcontainers.internal", ipAddress: portForwarder.getIpAddress() });
    }

    const container = await dockerClient.create({
      dockerImageName: this.dockerImageName,
      env: this.env,
      cmd: this.cmd,
      bindMounts: this.bindMounts,
      tmpFs: this.tmpFs,
      boundPorts,
      name: this.name,
      networkMode: this.networkAliases.length > 0 ? undefined : this.networkMode,
      healthCheck: this.healthCheck,
      useDefaultLogDriver: this.useDefaultLogDriver,
      privilegedMode: this.privilegedMode,
      autoRemove: this.daemonMode,
      extraHosts: this.extraHosts,
      ipcMode: this.ipcMode,
      user: this.user,
    });

    if (!this.dockerImageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance(dockerClient);
      const portForwarderNetworkId = portForwarder.getNetworkId();
      const excludedNetworks = [portForwarderNetworkId, "none", "host"];

      if (!this.networkMode || !excludedNetworks.includes(this.networkMode)) {
        await dockerClient.connectToNetwork(container.getId(), portForwarderNetworkId, []);
      }
    }

    if (this.networkMode && this.networkAliases.length > 0) {
      await dockerClient.connectToNetwork(container.getId(), this.networkMode, this.networkAliases);
    }

    if (this.tarToCopy) {
      await this.tarToCopy.finalize();
      await container.putArchive(this.tarToCopy, "/");
    }

    log.info(`Starting container ${this.dockerImageName} with ID: ${container.getId()}`);
    await dockerClient.start(container);

    const logs = await container.logs();
    logs
      .on("data", (data) => containerLog.trace(`${container.getId()}: ${data.trim()}`))
      .on("err", (data) => containerLog.error(`${container.getId()}: ${data.trim()}`));

    const inspectResult = await container.inspect();

    await this.waitForContainer(dockerClient, container, boundPorts);

    return new StartedGenericContainer(
      container,
      dockerClient.getHost(),
      inspectResult,
      boundPorts,
      inspectResult.name,
      dockerClient
    );
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

  public withNetworkAliases(...networkAliases: string[]): this {
    this.networkAliases = networkAliases;
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

  public withUser(user: string): this {
    this.user = user;
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

  public withIpcMode(ipcMode: string): this {
    this.ipcMode = ipcMode;
    return this;
  }

  public withCopyFileToContainer(sourcePath: string, containerPath: string): this {
    this.getTarToCopy().file(sourcePath, { name: containerPath });
    return this;
  }

  public withCopyContentToContainer(content: string | Buffer | Readable, containerPath: string): this {
    this.getTarToCopy().append(content, { name: containerPath });
    return this;
  }

  protected getTarToCopy(): archiver.Archiver {
    if (!this.tarToCopy) {
      this.tarToCopy = archiver("tar");
    }
    return this.tarToCopy;
  }

  protected preCreate?(dockerClient: DockerClient, boundPorts: BoundPorts): Promise<void>;

  private async waitForContainer(
    dockerClient: DockerClient,
    container: Container,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug(`Waiting for container to be ready: ${container.getId()}`);
    const waitStrategy = this.getWaitStrategy(dockerClient, container);

    try {
      await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, boundPorts);
      log.info("Container is ready");
    } catch (err) {
      log.error(`Container failed to be ready: ${err}`);

      if (this.daemonMode) {
        (await container.logs())
          .on("data", (data) => containerLog.trace(`${container.getId()}: ${data}`))
          .on("err", (data) => containerLog.error(`${container.getId()}: ${data}`));
      }

      try {
        await container.stop({ timeout: 0 });
        await container.remove({ removeVolumes: true });
      } catch (stopErr) {
        log.error(`Failed to stop container after it failed to be ready: ${stopErr}`);
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

  public getNetworkNames(): string[] {
    return Object.keys(this.inspectResult.networkSettings);
  }

  public getNetworkId(networkName: string): string {
    return this.inspectResult.networkSettings[networkName].networkId;
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
