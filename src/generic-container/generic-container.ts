import archiver from "archiver";
import AsyncLock from "async-lock";
import { BoundPorts } from "../bound-ports";
import { containerLog, log } from "../logger";
import { PortWithOptionalBinding } from "../port";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { ReaperInstance } from "../reaper";
import { DockerImageName } from "../docker-image-name";
import { StartedTestContainer, TestContainer } from "../test-container";
import { WaitStrategy } from "../wait-strategy/wait-strategy";
import { PortForwarderInstance } from "../port-forwarder";
import {
  BindMount,
  ContentToCopy,
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
import { initCreateContainerOptions } from "./create-container-options";
import { Wait } from "../wait-strategy/wait";

const reusableContainerCreationLock = new AsyncLock();

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: string, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  protected opts: CreateContainerOptions;
  protected startupTimeout?: number;
  protected waitStrategy: WaitStrategy = Wait.forListeningPorts();
  protected tarToCopy?: archiver.Archiver;
  protected networkMode?: string;
  protected networkAliases: string[] = [];
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();

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
    const { dockerode, indexServerAddress } = await dockerClient();

    await pullImage(dockerode, indexServerAddress, {
      imageName: this.opts.imageName,
      force: this.pullPolicy.shouldPull(),
    });

    if (!this.opts.reusable && !this.opts.imageName.isReaper()) {
      await ReaperInstance.getInstance();
    }

    if (this.beforeContainerStarted) {
      await this.beforeContainerStarted();
    } else if (this.preStart) {
      await this.preStart();
    }

    if (!this.opts.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      this.opts.extraHosts.push({ host: "host.testcontainers.internal", ipAddress: portForwarder.getIpAddress() });
    }

    if (this.networkAliases.length > 0) {
      this.opts.networkMode = undefined;
    } else {
      this.opts.networkMode = this.networkMode;
    }

    if (this.opts.reusable) {
      const containerHash = hash(JSON.stringify(this.opts));
      this.opts.labels = {
        ...this.opts.labels,
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
          return this.startContainer(this.opts);
        }
      });
    } else {
      return this.startContainer(this.opts);
    }
  }

  private async reuseContainer(container: Dockerode.Container) {
    const { host, hostIps } = await dockerClient();
    const inspectResult = await inspectContainer(container);
    const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult).filter(this.opts.exposedPorts);
    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    if (this.containerStarting) {
      await this.containerStarting(inspectResult, true);
    }

    await waitForContainer(container, this.waitStrategy, boundPorts);

    const startedContainer = new StartedGenericContainer(
      container,
      host,
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

  private async startContainer(createContainerOptions: CreateContainerOptions): Promise<StartedTestContainer> {
    const container = await createContainer(createContainerOptions);

    if (!this.opts.imageName.isHelperContainer() && PortForwarderInstance.isRunning()) {
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

    log.info(`Starting container ${this.opts.imageName} with ID: ${container.id}`);
    if (this.containerCreated) {
      await this.containerCreated(container.id);
    }

    await startContainer(container);

    const { host, hostIps } = await dockerClient();
    const inspectResult = await inspectContainer(container);
    const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult).filter(this.opts.exposedPorts);
    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    if (containerLog.enabled()) {
      (await containerLogs(container))
        .on("data", (data) => containerLog.trace(`${container.id}: ${data.trim()}`))
        .on("err", (data) => containerLog.error(`${container.id}: ${data.trim()}`));
    }

    if (this.containerStarting) {
      await this.containerStarting(inspectResult, false);
    }

    await waitForContainer(container, this.waitStrategy, boundPorts);

    const startedContainer = new StartedGenericContainer(
      container,
      host,
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
    this.opts.workingDir = workingDir;
    return this;
  }

  public withResourcesQuota({ memory, cpu }: ResourcesQuota): this {
    // Memory and CPU units from here: https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerCreate
    // see Memory, NanoCpus parameters
    const ram = memory !== undefined ? memory * 1024 ** 3 : undefined;
    const cpuQuota = cpu !== undefined ? cpu * 10 ** 9 : undefined;

    this.opts.resourcesQuota = { memory: ram, cpu: cpuQuota };

    return this;
  }
}
