import archiver from "archiver";
import AsyncLock from "async-lock";
import { BoundPorts } from "../bound-ports";
import { containerLog, log } from "../logger";
import { PortWithOptionalBinding } from "../port";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { ReaperInstance } from "../reaper";
import { DockerImageName } from "../docker-image-name";
import { StartedTestContainer, TestContainer } from "../test-container";
import { defaultWaitStrategy, WaitStrategy } from "../wait-strategy";
import { PortForwarderInstance } from "../port-forwarder";
import {
  BindMount,
  ContentToCopy,
  Environment,
  ExtraHost,
  FileToCopy,
  HealthCheck,
  Labels,
  TmpFs,
  Ulimits,
} from "../docker/types";
import { pullImage } from "../docker/functions/image/pull-image";
import { createContainer, CreateContainerOptions } from "../docker/functions/container/create-container";
import { connectNetwork } from "../docker/functions/network/connect-network";
import { dockerClient } from "../docker/docker-client";
import { inspectContainer, InspectResult } from "../docker/functions/container/inspect-container";
import Dockerode from "dockerode";
import { startContainer } from "../docker/functions/container/start-container";
import { containerLogs } from "../docker/functions/container/container-logs";
import { putContainerArchive } from "../docker/functions/container/put-container-archive";
import { GenericContainerBuilder } from "./generic-container-builder";
import { StartedGenericContainer } from "./started-generic-container";
import { hash } from "../hash";
import { getContainerByHash } from "../docker/functions/container/get-container";
import { LABEL_TESTCONTAINERS_CONTAINER_HASH } from "../labels";
import { StartedNetwork } from "../network";
import { waitForContainer } from "../wait-for-container";

const reusableContainerCreationLock = new AsyncLock();

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: string, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  private readonly imageName: DockerImageName;

  protected environment: Environment = {};
  protected networkMode?: string;
  protected networkAliases: string[] = [];
  protected ports: PortWithOptionalBinding[] = [];
  protected command: string[] = [];
  protected entrypoint?: string[];
  protected bindMounts: BindMount[] = [];
  protected name?: string;
  protected labels: Labels = {};
  protected tmpFs: TmpFs = {};
  protected healthCheck?: HealthCheck;
  protected waitStrategy?: WaitStrategy;
  protected startupTimeout = 60_000;
  protected useDefaultLogDriver = false;
  protected privilegedMode = false;
  protected workingDir?: string;
  protected ipcMode?: string;
  protected ulimits?: Ulimits;
  protected addedCapabilities?: string[];
  protected droppedCapabilities?: string[];
  protected user?: string;
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();
  protected reuse = false;
  protected tarToCopy?: archiver.Archiver;

  private extraHosts: ExtraHost[] = [];

  constructor(readonly image: string) {
    this.imageName = DockerImageName.fromString(image);
  }

  protected preStart?(): Promise<void>;

  public async start(): Promise<StartedTestContainer> {
    const { dockerode, indexServerAddress } = await dockerClient();
    await pullImage(dockerode, indexServerAddress, {
      imageName: this.imageName,
      force: this.pullPolicy.shouldPull(),
    });

    if (!this.reuse && !this.imageName.isReaper()) {
      await ReaperInstance.getInstance();
    }

    if (this.preStart) {
      await this.preStart();
    }

    if (!this.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      this.extraHosts.push({ host: "host.testcontainers.internal", ipAddress: portForwarder.getIpAddress() });
    }

    const createContainerOptions: CreateContainerOptions = {
      imageName: this.imageName,
      environment: this.environment,
      command: this.command,
      entrypoint: this.entrypoint,
      bindMounts: this.bindMounts,
      tmpFs: this.tmpFs,
      exposedPorts: this.ports,
      name: this.name,
      labels: this.labels,
      reusable: this.reuse,
      networkMode: this.networkAliases.length > 0 ? undefined : this.networkMode,
      healthCheck: this.healthCheck,
      useDefaultLogDriver: this.useDefaultLogDriver,
      privilegedMode: this.privilegedMode,
      autoRemove: this.imageName.isReaper(),
      extraHosts: this.extraHosts,
      ipcMode: this.ipcMode,
      ulimits: this.ulimits,
      addedCapabilities: this.addedCapabilities,
      droppedCapabilities: this.droppedCapabilities,
      user: this.user,
      workingDir: this.workingDir,
    };

    if (this.reuse) {
      const containerHash = hash(JSON.stringify(createContainerOptions));
      createContainerOptions.labels = {
        ...createContainerOptions.labels,
        [LABEL_TESTCONTAINERS_CONTAINER_HASH]: containerHash,
      };
      log.debug(`Container reuse has been enabled, hash: ${containerHash}`);

      // We might have several async processes try to create a reusable container
      // at once, to avoid possibly creating too many of these, use a lock
      // on the containerHash, this ensures that only single reusable instance is created
      return reusableContainerCreationLock.acquire(containerHash, async () => {
        const container = await getContainerByHash(containerHash);

        if (container !== undefined) {
          log.debug(`Found container to reuse with hash: ${containerHash}`);
          return this.reuseContainer(container);
        } else {
          log.debug("No container found to reuse");
          return this.startContainer(createContainerOptions);
        }
      });
    } else {
      return this.startContainer(createContainerOptions);
    }
  }

  private async reuseContainer(startedContainer: Dockerode.Container) {
    const { host, hostIps } = await dockerClient();
    const inspectResult = await inspectContainer(startedContainer);
    const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult).filter(this.ports);
    const waitStrategy = (this.waitStrategy ?? defaultWaitStrategy(host, startedContainer)).withStartupTimeout(
      this.startupTimeout
    );
    await waitForContainer(startedContainer, waitStrategy, host, boundPorts);

    return new StartedGenericContainer(
      startedContainer,
      host,
      inspectResult,
      boundPorts,
      inspectResult.name,
      waitStrategy
    );
  }

  private async startContainer(createContainerOptions: CreateContainerOptions): Promise<StartedTestContainer> {
    const container = await createContainer(createContainerOptions);

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
      this.tarToCopy.finalize();
      await putContainerArchive({ container, stream: this.tarToCopy, containerPath: "/" });
    }

    log.info(`Starting container ${this.imageName} with ID: ${container.id}`);
    await startContainer(container);

    const { host, hostIps } = await dockerClient();
    const inspectResult = await inspectContainer(container);
    const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult).filter(this.ports);
    const waitStrategy = (this.waitStrategy ?? defaultWaitStrategy(host, container)).withStartupTimeout(
      this.startupTimeout
    );

    (await containerLogs(container))
      .on("data", (data) => containerLog.trace(`${container.id}: ${data.trim()}`))
      .on("err", (data) => containerLog.error(`${container.id}: ${data.trim()}`));

    await waitForContainer(container, waitStrategy, host, boundPorts);

    const startedContainer = new StartedGenericContainer(
      container,
      host,
      inspectResult,
      boundPorts,
      inspectResult.name,
      waitStrategy
    );

    if (this.postStart) {
      await this.postStart(startedContainer, inspectResult, boundPorts);
    }

    return startedContainer;
  }

  protected postStart?(
    container: StartedTestContainer,
    inspectResult: InspectResult,
    boundPorts: BoundPorts
  ): Promise<void>;

  protected get hasExposedPorts(): boolean {
    return this.ports.length !== 0;
  }

  public withCommand(command: string[]): this {
    this.command = command;
    return this;
  }

  public withEntrypoint(entrypoint: string[]): this {
    this.entrypoint = entrypoint;
    return this;
  }

  public withName(name: string): this {
    this.name = name;
    return this;
  }

  public withLabels(labels: Labels): this {
    this.labels = { ...this.labels, ...labels };
    return this;
  }

  public withEnvironment(environment: Environment): this {
    this.environment = { ...this.environment, ...environment };
    return this;
  }

  public withTmpFs(tmpFs: TmpFs): this {
    this.tmpFs = { ...this.tmpFs, ...tmpFs };
    return this;
  }

  public withUlimits(ulimits: Ulimits): this {
    this.ulimits = { ...this.ulimits, ...ulimits };
    return this;
  }

  public withAddedCapabilities(...capabilities: string[]): this {
    this.addedCapabilities = [...(this.addedCapabilities ?? []), ...capabilities];
    return this;
  }

  public withDroppedCapabilities(...capabilities: string[]): this {
    this.droppedCapabilities = [...(this.droppedCapabilities ?? []), ...capabilities];
    return this;
  }

  public withNetwork(network: StartedNetwork): this {
    this.networkMode = network.getName();
    return this;
  }

  public withNetworkMode(networkMode: string): this {
    this.networkMode = networkMode;
    return this;
  }

  public withNetworkAliases(...networkAliases: string[]): this {
    this.networkAliases = [...this.networkAliases, ...networkAliases];
    return this;
  }

  public withExtraHosts(extraHosts: ExtraHost[]): this {
    this.extraHosts = [...this.extraHosts, ...extraHosts];
    return this;
  }

  public withExposedPorts(...ports: PortWithOptionalBinding[]): this {
    this.ports = [...this.ports, ...ports];
    return this;
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    this.bindMounts = bindMounts.map((bindMount) => ({ mode: "rw", ...bindMount }));
    return this;
  }

  public withHealthCheck(healthCheck: HealthCheck): this {
    this.healthCheck = healthCheck;
    return this;
  }

  public withStartupTimeout(startupTimeoutMs: number): this {
    this.startupTimeout = startupTimeoutMs;
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

  public withReuse(): this {
    this.reuse = true;
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

  public withCopyFilesToContainer(filesToCopy: FileToCopy[]): this {
    const tar = this.getTarToCopy();
    filesToCopy.forEach(({ source, target }) => tar.file(source, { name: target }));
    return this;
  }

  public withCopyContentToContainer(contentsToCopy: ContentToCopy[]): this {
    const tar = this.getTarToCopy();
    contentsToCopy.forEach(({ content, target }) => tar.append(content, { name: target }));
    return this;
  }

  protected getTarToCopy(): archiver.Archiver {
    if (!this.tarToCopy) {
      this.tarToCopy = archiver("tar");
    }
    return this.tarToCopy;
  }

  public withWorkingDir(workingDir: string): this {
    this.workingDir = workingDir;
    return this;
  }
}
