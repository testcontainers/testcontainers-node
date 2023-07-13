import archiver from "archiver";
import AsyncLock from "async-lock";
import { BoundPorts } from "../bound-ports";
import { containerLog, log } from "../logger";
import { PortWithOptionalBinding } from "../port";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { DockerImageName } from "../docker-image-name";
import { StartedTestContainer, TestContainer } from "../test-container";
import { WaitStrategy } from "../wait-strategy/wait-strategy";
import { PortForwarderInstance } from "../port-forwarder";
import {
  BindMount,
  ContentToCopy,
  DirectoryToCopy,
  Environment,
  ExtraHost,
  FileToCopy,
  HealthCheck,
  Labels,
  ResourcesQuota,
  TmpFs,
  Ulimits,
} from "../docker/types";
import { pullImage } from "../docker/functions/image/pull-image";
import { createContainer, CreateContainerOptions } from "../docker/functions/container/create-container";
import { connectNetwork } from "../docker/functions/network/connect-network";
import { getDockerClient } from "../docker/client/docker-client";
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
import { initCreateContainerOptions } from "./create-container-options";
import { Wait } from "../wait-strategy/wait";
import { Readable } from "stream";
import { DockerClient } from "../docker/client/docker-client-types";

const reusableContainerCreationLock = new AsyncLock();

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: string, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  protected opts: CreateContainerOptions;
  protected startupTimeout?: number;
  protected waitStrategy: WaitStrategy = Wait.forListeningPorts();
  protected networkMode?: string;
  protected networkAliases: string[] = [];
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();
  protected logConsumer?: (stream: Readable) => unknown;
  protected filesToCopy: FileToCopy[] = [];
  protected directoriesToCopy: DirectoryToCopy[] = [];
  protected contentsToCopy: ContentToCopy[] = [];

  constructor(readonly image: string) {
    const imageName = DockerImageName.fromString(image);
    this.opts = initCreateContainerOptions(imageName, imageName.isReaper());
  }

  /**
   * @deprecated Since version 9.4.0. Will be removed in version 10.0.0. Use `beforeContainerStarted` instead.
   */
  protected preStart?(): Promise<void>;

  protected beforeContainerStarted?(): Promise<void>;

  protected containerCreated?(containerId: string): Promise<void>;

  protected containerStarting?(inspectResult: InspectResult, reused: boolean): Promise<void>;

  public async start(): Promise<StartedTestContainer> {
    const dockerClient = await getDockerClient();

    await pullImage(dockerClient.dockerode, dockerClient.info.dockerInfo.indexServerAddress, {
      imageName: this.opts.imageName,
      force: this.pullPolicy.shouldPull(),
    });

    if (this.beforeContainerStarted) {
      await this.beforeContainerStarted();
    } else if (this.preStart) {
      await this.preStart();
    }

    if (!this.opts.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      this.opts.extraHosts.push({ host: "host.testcontainers.internal", ipAddress: portForwarder.getIpAddress() });
    }
    this.opts.networkMode = this.networkAliases.length > 0 ? undefined : this.networkMode;

    if (this.opts.reusable) {
      return this.reuseOrStartContainer(dockerClient);
    }
    return this.startContainer(dockerClient, this.opts);
  }

  private async reuseOrStartContainer(dockerClient: DockerClient) {
    const containerHash = hash(JSON.stringify(this.opts));
    this.opts.labels = { ...this.opts.labels, [LABEL_TESTCONTAINERS_CONTAINER_HASH]: containerHash };
    log.debug(`Container reuse has been enabled with hash "${containerHash}"`);

    return reusableContainerCreationLock.acquire(containerHash, async () => {
      const container = await getContainerByHash(containerHash);
      if (container !== undefined) {
        log.debug(`Found container to reuse with hash "${containerHash}"`, { containerId: container.id });
        return this.reuseContainer(dockerClient, container);
      }
      log.debug("No container found to reuse");
      return this.startContainer(dockerClient, this.opts);
    });
  }

  private async reuseContainer(dockerClient: DockerClient, container: Dockerode.Container) {
    const inspectResult = await inspectContainer(container);
    const boundPorts = BoundPorts.fromInspectResult(dockerClient.hostIps, inspectResult).filter(this.opts.exposedPorts);
    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    if (this.containerStarting) {
      await this.containerStarting(inspectResult, true);
    }

    await waitForContainer(container, this.waitStrategy, boundPorts);

    const startedContainer = new StartedGenericContainer(
      container,
      dockerClient.host,
      inspectResult,
      boundPorts,
      inspectResult.name,
      this.waitStrategy
    );

    if (this.containerStarted) {
      await this.containerStarted(startedContainer, inspectResult, true);
    } else if (this.postStart) {
      await this.postStart(startedContainer, inspectResult, boundPorts);
    }

    return startedContainer;
  }

  private async startContainer(
    dockerClient: DockerClient,
    createContainerOptions: CreateContainerOptions
  ): Promise<StartedTestContainer> {
    const container = await createContainer(dockerClient.sessionId, createContainerOptions);

    if (!this.opts.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      await this.connectContainerToPortForwarder(container);
    }

    if (this.networkMode && this.networkAliases.length > 0) {
      await connectNetwork({
        containerId: container.id,
        networkId: this.networkMode,
        networkAliases: this.networkAliases,
      });
    }

    if (this.filesToCopy.length > 0 || this.directoriesToCopy.length > 0 || this.contentsToCopy.length > 0) {
      const archive = this.createArchiveToCopyToContainer();
      archive.finalize();
      await putContainerArchive({ container, stream: archive, containerPath: "/" });
    }

    log.info(`Starting container for image "${this.opts.imageName}"...`, { containerId: container.id });
    if (this.containerCreated) {
      await this.containerCreated(container.id);
    }

    await startContainer(container);
    log.info(`Started container for image "${this.opts.imageName}"`, { containerId: container.id });

    const inspectResult = await inspectContainer(container);
    const boundPorts = BoundPorts.fromInspectResult(dockerClient.hostIps, inspectResult).filter(this.opts.exposedPorts);
    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    if (containerLog.enabled() || this.logConsumer !== undefined) {
      const logStream = await containerLogs(container);

      if (this.logConsumer !== undefined) {
        this.logConsumer(logStream);
      }

      if (containerLog.enabled()) {
        logStream
          .on("data", (data) => containerLog.trace(data.trim(), { containerId: container.id }))
          .on("err", (data) => containerLog.error(data.trim(), { containerId: container.id }));
      }
    }

    if (this.containerStarting) {
      await this.containerStarting(inspectResult, false);
    }

    await waitForContainer(container, this.waitStrategy, boundPorts);

    const startedContainer = new StartedGenericContainer(
      container,
      dockerClient.host,
      inspectResult,
      boundPorts,
      inspectResult.name,
      this.waitStrategy
    );

    if (this.containerStarted) {
      await this.containerStarted(startedContainer, inspectResult, false);
    } else if (this.postStart) {
      await this.postStart(startedContainer, inspectResult, boundPorts);
    }

    return startedContainer;
  }

  private async connectContainerToPortForwarder(container: Dockerode.Container) {
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

  private createArchiveToCopyToContainer(): archiver.Archiver {
    const tar = archiver("tar");

    for (const { source, target, mode } of this.filesToCopy) {
      tar.file(source, { name: target, mode });
    }
    for (const { source, target, mode } of this.directoriesToCopy) {
      tar.directory(source, target, { mode });
    }
    for (const { content, target, mode } of this.contentsToCopy) {
      tar.append(content, { name: target, mode });
    }

    return tar;
  }

  /**
   * @deprecated Since version 9.4.0. Will be removed in version 10.0.0. Use `containerStarted` instead.
   */
  protected postStart?(
    container: StartedTestContainer,
    inspectResult: InspectResult,
    boundPorts: BoundPorts
  ): Promise<void>;

  protected containerStarted?(
    container: StartedTestContainer,
    inspectResult: InspectResult,
    reused: boolean
  ): Promise<void>;

  protected get hasExposedPorts(): boolean {
    return this.opts.exposedPorts.length !== 0;
  }

  public withCommand(command: string[]): this {
    this.opts.command = command;
    return this;
  }

  public withEntrypoint(entrypoint: string[]): this {
    this.opts.entrypoint = entrypoint;
    return this;
  }

  public withName(name: string): this {
    this.opts.name = name;
    return this;
  }

  public withLabels(labels: Labels): this {
    this.opts.labels = { ...this.opts.labels, ...labels };
    return this;
  }

  public withEnvironment(environment: Environment): this {
    this.opts.environment = { ...this.opts.environment, ...environment };
    return this;
  }

  public withTmpFs(tmpFs: TmpFs): this {
    this.opts.tmpFs = { ...this.opts.tmpFs, ...tmpFs };
    return this;
  }

  public withUlimits(ulimits: Ulimits): this {
    this.opts.ulimits = { ...this.opts.ulimits, ...ulimits };
    return this;
  }

  public withAddedCapabilities(...capabilities: string[]): this {
    this.opts.addedCapabilities = [...(this.opts.addedCapabilities ?? []), ...capabilities];
    return this;
  }

  public withDroppedCapabilities(...capabilities: string[]): this {
    this.opts.droppedCapabilities = [...(this.opts.droppedCapabilities ?? []), ...capabilities];
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
    this.opts.extraHosts = [...this.opts.extraHosts, ...extraHosts];
    return this;
  }

  public withExposedPorts(...ports: PortWithOptionalBinding[]): this {
    this.opts.exposedPorts = [...this.opts.exposedPorts, ...ports];
    return this;
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    this.opts.bindMounts = bindMounts.map((bindMount) => ({ mode: "rw", ...bindMount }));
    return this;
  }

  public withHealthCheck(healthCheck: HealthCheck): this {
    this.opts.healthCheck = healthCheck;
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
    this.opts.useDefaultLogDriver = true;
    return this;
  }

  public withPrivilegedMode(): this {
    this.opts.privilegedMode = true;
    return this;
  }

  public withUser(user: string): this {
    this.opts.user = user;
    return this;
  }

  public withReuse(): this {
    this.opts.reusable = true;
    return this;
  }

  public withPullPolicy(pullPolicy: PullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public withIpcMode(ipcMode: string): this {
    this.opts.ipcMode = ipcMode;
    return this;
  }

  public withCopyFilesToContainer(filesToCopy: FileToCopy[]): this {
    this.filesToCopy = [...this.filesToCopy, ...filesToCopy];
    return this;
  }

  public withCopyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): this {
    this.directoriesToCopy = [...this.directoriesToCopy, ...directoriesToCopy];
    return this;
  }

  public withCopyContentToContainer(contentsToCopy: ContentToCopy[]): this {
    this.contentsToCopy = [...this.contentsToCopy, ...contentsToCopy];
    return this;
  }

  public withWorkingDir(workingDir: string): this {
    this.opts.workingDir = workingDir;
    return this;
  }

  public withResourcesQuota({ memory, cpu }: ResourcesQuota): this {
    this.opts.resourcesQuota = {
      memory: memory !== undefined ? memory * 1024 ** 3 : undefined,
      cpu: cpu !== undefined ? cpu * 10 ** 9 : undefined,
    };
    return this;
  }

  public withSharedMemorySize(bytes: number): this {
    this.opts.sharedMemorySize = bytes;
    return this;
  }

  public withLogConsumer(logConsumer: (stream: Readable) => unknown): this {
    this.logConsumer = logConsumer;
    return this;
  }
}
