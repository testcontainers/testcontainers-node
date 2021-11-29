import archiver from "archiver";
import { BoundPorts } from "../bound-ports";
import { containerLog, log } from "../logger";
import { Port } from "../port";
import { PortBinder } from "../port-binder";
import { HostPortCheck, InternalPortCheck } from "../port-check";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { ReaperInstance } from "../reaper";
import { DockerImageName } from "../docker-image-name";
import { StartedTestContainer, TestContainer } from "../test-container";
import { HostPortWaitStrategy, WaitStrategy } from "../wait-strategy";
import { Readable } from "stream";
import { PortForwarderInstance } from "../port-forwarder";
import { getAuthConfig } from "../registry-auth-locator";
import {
  BindMode,
  BindMount,
  BuildContext,
  Command,
  ContainerName,
  Dir,
  Env,
  EnvKey,
  EnvValue,
  ExtraHost,
  HealthCheck,
  Host,
  NetworkMode,
  TmpFs,
} from "../docker/types";
import { pullImage } from "../docker/functions/image/pull-image";
import { createContainer } from "../docker/functions/container/create-container";
import { connectNetwork } from "../docker/functions/network/connect-network";
import { dockerHost } from "../docker/docker-host";
import { inspectContainer } from "../docker/functions/container/inspect-container";
import Dockerode from "dockerode";
import { startContainer } from "../docker/functions/container/start-container";
import { containerLogs } from "../docker/functions/container/container-logs";
import { stopContainer } from "../docker/functions/container/stop-container";
import { removeContainer } from "../docker/functions/container/remove-container";
import { putContainerArchive } from "../docker/functions/container/put-container-archive";
import { GenericContainerBuilder } from "./generic-container-builder";
import { StartedGenericContainer } from "./started-generic-container";

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: BuildContext, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  private readonly imageName: DockerImageName;

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
  protected ipcMode?: string;
  protected user?: string;
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();
  protected tarToCopy?: archiver.Archiver;

  private extraHosts: ExtraHost[] = [];

  constructor(readonly image: string) {
    this.imageName = DockerImageName.fromString(image);
  }

  public async start(): Promise<StartedTestContainer> {
    await pullImage({
      imageName: this.imageName,
      force: this.pullPolicy.shouldPull(),
      authConfig: await getAuthConfig(this.imageName.registry),
    });

    const boundPorts = await new PortBinder().bind(this.ports);

    if (!this.imageName.isReaper()) {
      await ReaperInstance.getInstance();
    }

    if (this.preCreate) {
      await this.preCreate(boundPorts);
    }

    if (!this.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      this.extraHosts.push({ host: "host.testcontainers.internal", ipAddress: portForwarder.getIpAddress() });
    }

    const container = await createContainer({
      imageName: this.imageName,
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
      autoRemove: this.imageName.isReaper(),
      extraHosts: this.extraHosts,
      ipcMode: this.ipcMode,
      user: this.user,
    });

    if (!this.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      const portForwarderNetworkId = portForwarder.getNetworkId();
      const excludedNetworks = [portForwarderNetworkId, "none", "host"];

      if (!this.networkMode || !excludedNetworks.includes(this.networkMode)) {
        await connectNetwork({
          containerId: container.id,
          networkId: portForwarderNetworkId,
          networkAliases: [],
        });
      }
    }

    if (this.networkMode && this.networkAliases.length > 0) {
      await connectNetwork({
        containerId: container.id,
        networkId: this.networkMode,
        networkAliases: this.networkAliases,
      });
    }

    if (this.tarToCopy) {
      await this.tarToCopy.finalize();
      await putContainerArchive({ container, stream: this.tarToCopy, containerPath: "/" });
    }

    log.info(`Starting container ${this.imageName} with ID: ${container.id}`);
    await startContainer(container);

    (await containerLogs(container))
      .on("data", (data) => containerLog.trace(`${container.id}: ${data.trim()}`))
      .on("err", (data) => containerLog.error(`${container.id}: ${data.trim()}`));

    const inspectResult = await inspectContainer(container);

    await this.waitForContainer(container, boundPorts);

    return new StartedGenericContainer(container, await dockerHost, inspectResult, boundPorts, inspectResult.name);
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

  public withExtraHosts(...extraHosts: ExtraHost[]): this {
    this.extraHosts.push(...extraHosts);
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

  protected preCreate?(boundPorts: BoundPorts): Promise<void>;

  private async waitForContainer(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    log.debug(`Waiting for container to be ready: ${container.id}`);
    const waitStrategy = this.getWaitStrategy(await dockerHost, container);

    try {
      await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, boundPorts);
      log.info("Container is ready");
    } catch (err) {
      log.error(`Container failed to be ready: ${err}`);
      try {
        await stopContainer(container, { timeout: 0 });
        await removeContainer(container, { removeVolumes: true });
      } catch (stopErr) {
        log.error(`Failed to stop container after it failed to be ready: ${stopErr}`);
      }
      throw err;
    }
  }

  private getWaitStrategy(host: Host, container: Dockerode.Container): WaitStrategy {
    if (this.waitStrategy) {
      return this.waitStrategy;
    }
    const hostPortCheck = new HostPortCheck(host);
    const internalPortCheck = new InternalPortCheck(container);
    return new HostPortWaitStrategy(hostPortCheck, internalPortCheck);
  }
}
