import archiver from "archiver";
import AsyncLock from "async-lock";
import { Container, ContainerCreateOptions, HostConfig } from "dockerode";
import { Readable } from "stream";
import { containerLog, hash, log } from "../common";
import { ContainerRuntimeClient, getContainerRuntimeClient, ImageName } from "../container-runtime";
import { CONTAINER_STATUSES } from "../container-runtime/clients/container/types";
import { StartedNetwork } from "../network/network";
import { PortForwarderInstance, SSHD_IMAGE } from "../port-forwarder/port-forwarder";
import { getReaper, REAPER_IMAGE } from "../reaper/reaper";
import { StartedTestContainer, TestContainer } from "../test-container";
import {
  ArchiveToCopy,
  BindMount,
  ContentToCopy,
  DirectoryToCopy,
  Environment,
  ExtraHost,
  FileToCopy,
  HealthCheck,
  InspectResult,
  Labels,
  ResourcesQuota,
  TmpFs,
  Ulimits,
} from "../types";
import { BoundPorts } from "../utils/bound-ports";
import { createLabels, LABEL_TESTCONTAINERS_CONTAINER_HASH, LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { mapInspectResult } from "../utils/map-inspect-result";
import { getContainerPort, hasHostBinding, PortWithOptionalBinding } from "../utils/port";
import { ImagePullPolicy, PullPolicy } from "../utils/pull-policy";
import { Wait } from "../wait-strategies/wait";
import { waitForContainer } from "../wait-strategies/wait-for-container";
import { WaitStrategy } from "../wait-strategies/wait-strategy";
import { GenericContainerBuilder } from "./generic-container-builder";
import { StartedGenericContainer } from "./started-generic-container";

const reusableContainerCreationLock = new AsyncLock();

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: string, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  protected createOpts: ContainerCreateOptions;
  protected hostConfig: HostConfig;

  protected imageName: ImageName;
  protected startupTimeout?: number;
  protected waitStrategy: WaitStrategy = Wait.forListeningPorts();
  protected environment: Record<string, string> = {};
  protected exposedPorts: PortWithOptionalBinding[] = [];
  protected reuse = false;
  protected networkMode?: string;
  protected networkAliases: string[] = [];
  protected pullPolicy: ImagePullPolicy = PullPolicy.defaultPolicy();
  protected logConsumer?: (stream: Readable) => unknown;
  protected filesToCopy: FileToCopy[] = [];
  protected directoriesToCopy: DirectoryToCopy[] = [];
  protected contentsToCopy: ContentToCopy[] = [];
  protected archivesToCopy: ArchiveToCopy[] = [];
  protected healthCheck?: HealthCheck;

  constructor(image: string) {
    this.imageName = ImageName.fromString(image);
    this.createOpts = { Image: this.imageName.string };
    this.hostConfig = { AutoRemove: this.imageName.string === REAPER_IMAGE };
  }

  private isHelperContainer() {
    return this.isReaper() || this.imageName.string === SSHD_IMAGE;
  }

  private isReaper() {
    return this.imageName.string === REAPER_IMAGE;
  }

  protected beforeContainerCreated?(): Promise<void>;

  protected containerCreated?(containerId: string): Promise<void>;

  protected containerStarting?(inspectResult: InspectResult, reused: boolean): Promise<void>;

  public async start(): Promise<StartedTestContainer> {
    const client = await getContainerRuntimeClient();
    await client.image.pull(this.imageName, {
      force: this.pullPolicy.shouldPull(),
      platform: this.createOpts.platform,
    });

    if (this.beforeContainerCreated) {
      await this.beforeContainerCreated();
    }

    if (!this.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      this.hostConfig.ExtraHosts = [
        ...(this.hostConfig.ExtraHosts ?? []),
        `host.testcontainers.internal:${portForwarder.getIpAddress()}`,
      ];
    }
    this.hostConfig.NetworkMode = this.networkAliases.length > 0 ? undefined : this.networkMode;

    this.createOpts.Labels = { ...createLabels(), ...this.createOpts.Labels };

    if (process.env.TESTCONTAINERS_REUSE_ENABLE !== "false" && this.reuse) {
      return this.reuseOrStartContainer(client);
    }

    if (!this.isReaper()) {
      const reaper = await getReaper(client);
      this.createOpts.Labels = { ...this.createOpts.Labels, [LABEL_TESTCONTAINERS_SESSION_ID]: reaper.sessionId };
    }

    return this.startContainer(client);
  }

  private async reuseOrStartContainer(client: ContainerRuntimeClient) {
    const containerHash = hash(JSON.stringify(this.createOpts));
    this.createOpts.Labels = { ...this.createOpts.Labels, [LABEL_TESTCONTAINERS_CONTAINER_HASH]: containerHash };
    log.debug(`Container reuse has been enabled with hash "${containerHash}"`);

    return reusableContainerCreationLock.acquire(containerHash, async () => {
      const container = await client.container.fetchByLabel(LABEL_TESTCONTAINERS_CONTAINER_HASH, containerHash, {
        status: CONTAINER_STATUSES.filter(
          (status) => status !== "removing" && status !== "dead" && status !== "restarting"
        ),
      });
      if (container !== undefined) {
        log.debug(`Found container to reuse with hash "${containerHash}"`, { containerId: container.id });
        return this.reuseContainer(client, container);
      }
      log.debug("No container found to reuse");
      return this.startContainer(client);
    });
  }

  private async reuseContainer(client: ContainerRuntimeClient, container: Container) {
    let inspectResult = await client.container.inspect(container);
    if (!inspectResult.State.Running) {
      log.debug("Reused container is not running, attempting to start it");
      await client.container.start(container);
      // Refetch the inspect result to get the updated state
      inspectResult = await client.container.inspect(container);
    }

    const mappedInspectResult = mapInspectResult(inspectResult);
    const boundPorts = BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult).filter(
      this.exposedPorts
    );
    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    await waitForContainer(client, container, this.waitStrategy, boundPorts);

    return new StartedGenericContainer(
      container,
      client.info.containerRuntime.host,
      inspectResult,
      boundPorts,
      inspectResult.Name,
      this.waitStrategy
    );
  }

  private async startContainer(client: ContainerRuntimeClient): Promise<StartedTestContainer> {
    const container = await client.container.create({ ...this.createOpts, HostConfig: this.hostConfig });

    if (!this.isHelperContainer() && PortForwarderInstance.isRunning()) {
      await this.connectContainerToPortForwarder(client, container);
    }

    if (this.networkMode && this.networkAliases.length > 0) {
      const network = client.network.getById(this.networkMode);
      await client.container.connectToNetwork(container, network, this.networkAliases);
    }

    if (this.filesToCopy.length > 0 || this.directoriesToCopy.length > 0 || this.contentsToCopy.length > 0) {
      const archive = this.createArchiveToCopyToContainer();
      archive.finalize();
      await client.container.putArchive(container, archive, "/");
    }

    for (const archive of this.archivesToCopy) {
      await client.container.putArchive(container, archive.tar, archive.target);
    }

    log.info(`Starting container for image "${this.createOpts.Image}"...`, { containerId: container.id });
    if (this.containerCreated) {
      await this.containerCreated(container.id);
    }

    await client.container.start(container);
    log.info(`Started container for image "${this.createOpts.Image}"`, { containerId: container.id });

    const inspectResult = await client.container.inspect(container);
    const mappedInspectResult = mapInspectResult(inspectResult);
    const boundPorts = BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult).filter(
      this.exposedPorts
    );

    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    if (containerLog.enabled() || this.logConsumer !== undefined) {
      if (this.logConsumer !== undefined) {
        this.logConsumer(await client.container.logs(container));
      }

      if (containerLog.enabled()) {
        (await client.container.logs(container))
          .on("data", (data) => containerLog.trace(data.trim(), { containerId: container.id }))
          .on("err", (data) => containerLog.error(data.trim(), { containerId: container.id }));
      }
    }

    if (this.containerStarting) {
      await this.containerStarting(mappedInspectResult, false);
    }

    await waitForContainer(client, container, this.waitStrategy, boundPorts);

    const startedContainer = new StartedGenericContainer(
      container,
      client.info.containerRuntime.host,
      inspectResult,
      boundPorts,
      inspectResult.Name,
      this.waitStrategy
    );

    if (this.containerStarted) {
      await this.containerStarted(startedContainer, mappedInspectResult, false);
    }

    return startedContainer;
  }

  private async connectContainerToPortForwarder(client: ContainerRuntimeClient, container: Container) {
    const portForwarder = await PortForwarderInstance.getInstance();
    const portForwarderNetworkId = portForwarder.getNetworkId();
    const excludedNetworks = [portForwarderNetworkId, "none", "host"];

    if (!this.networkMode || !excludedNetworks.includes(this.networkMode)) {
      const network = client.network.getById(portForwarderNetworkId);
      await client.container.connectToNetwork(container, network, []);
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

  protected containerStarted?(
    container: StartedTestContainer,
    inspectResult: InspectResult,
    reused: boolean
  ): Promise<void>;

  public withCommand(command: string[]): this {
    this.createOpts.Cmd = command;
    return this;
  }

  public withEntrypoint(entrypoint: string[]): this {
    this.createOpts.Entrypoint = entrypoint;
    return this;
  }

  public withName(name: string): this {
    this.createOpts.name = name;
    return this;
  }

  public withLabels(labels: Labels): this {
    this.createOpts.Labels = { ...this.createOpts.Labels, ...labels };
    return this;
  }

  public withEnvironment(environment: Environment): this {
    this.environment = { ...this.environment, ...environment };
    this.createOpts.Env = [
      ...(this.createOpts.Env ?? []),
      ...Object.entries(environment).map(([key, value]) => `${key}=${value}`),
    ];
    return this;
  }

  public withPlatform(platform: string): this {
    this.createOpts.platform = platform;
    return this;
  }

  public withTmpFs(tmpFs: TmpFs): this {
    this.hostConfig.Tmpfs = { ...this.hostConfig.Tmpfs, ...tmpFs };
    return this;
  }

  public withUlimits(ulimits: Ulimits): this {
    this.hostConfig.Ulimits = [
      ...(this.hostConfig.Ulimits ?? []),
      ...Object.entries(ulimits).map(([key, value]) => ({
        Name: key,
        Hard: value.hard,
        Soft: value.soft,
      })),
    ];
    return this;
  }

  public withAddedCapabilities(...capabilities: string[]): this {
    this.hostConfig.CapAdd = [...(this.hostConfig.CapAdd ?? []), ...capabilities];
    return this;
  }

  public withDroppedCapabilities(...capabilities: string[]): this {
    this.hostConfig.CapDrop = [...(this.hostConfig.CapDrop ?? []), ...capabilities];
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
    this.hostConfig.ExtraHosts = [
      ...(this.hostConfig.ExtraHosts ?? []),
      ...extraHosts.map((extraHost) => `${extraHost.host}:${extraHost.ipAddress}`),
    ];
    return this;
  }

  public withExposedPorts(...ports: PortWithOptionalBinding[]): this {
    const exposedPorts: { [port: string]: Record<string, never> } = {};
    for (const exposedPort of ports) {
      exposedPorts[getContainerPort(exposedPort).toString()] = {};
    }

    this.exposedPorts = [...this.exposedPorts, ...ports];
    this.createOpts.ExposedPorts = {
      ...this.createOpts.ExposedPorts,
      ...exposedPorts,
    };

    const portBindings: Record<string, Array<Record<string, string>>> = {};
    for (const exposedPort of ports) {
      if (hasHostBinding(exposedPort)) {
        portBindings[exposedPort.container] = [{ HostPort: exposedPort.host.toString() }];
      } else {
        portBindings[exposedPort] = [{ HostPort: "0" }];
      }
    }

    this.hostConfig.PortBindings = {
      ...this.hostConfig.PortBindings,
      ...portBindings,
    };

    return this;
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    this.hostConfig.Binds = bindMounts
      .map((bindMount) => ({ mode: "rw", ...bindMount }))
      .map(({ source, target, mode }) => `${source}:${target}:${mode}`);
    return this;
  }

  public withHealthCheck(healthCheck: HealthCheck): this {
    const toNanos = (duration: number): number => duration * 1e6;

    this.healthCheck = healthCheck;
    this.createOpts.Healthcheck = {
      Test: healthCheck.test,
      Interval: healthCheck.interval ? toNanos(healthCheck.interval) : 0,
      Timeout: healthCheck.timeout ? toNanos(healthCheck.timeout) : 0,
      Retries: healthCheck.retries || 0,
      StartPeriod: healthCheck.startPeriod ? toNanos(healthCheck.startPeriod) : 0,
    };

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
    this.hostConfig.LogConfig = {
      Type: "json-file",
      Config: {},
    };
    return this;
  }

  public withPrivilegedMode(): this {
    this.hostConfig.Privileged = true;
    return this;
  }

  public withUser(user: string): this {
    this.createOpts.User = user;
    return this;
  }

  public withReuse(): this {
    this.reuse = true;
    return this;
  }

  public withPullPolicy(pullPolicy: ImagePullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public withIpcMode(ipcMode: string): this {
    this.hostConfig.IpcMode = ipcMode;
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

  public withCopyArchivesToContainer(archivesToCopy: ArchiveToCopy[]): this {
    this.archivesToCopy = [...this.archivesToCopy, ...archivesToCopy];
    return this;
  }

  public withWorkingDir(workingDir: string): this {
    this.createOpts.WorkingDir = workingDir;
    return this;
  }

  public withResourcesQuota({ memory, cpu }: ResourcesQuota): this {
    this.hostConfig.Memory = memory !== undefined ? memory * 1024 ** 3 : undefined;
    this.hostConfig.NanoCpus = cpu !== undefined ? cpu * 10 ** 9 : undefined;
    return this;
  }

  public withSharedMemorySize(bytes: number): this {
    this.hostConfig.ShmSize = bytes;
    return this;
  }

  public withLogConsumer(logConsumer: (stream: Readable) => unknown): this {
    this.logConsumer = logConsumer;
    return this;
  }

  public withHostname(hostname: string): this {
    this.createOpts.Hostname = hostname;
    return this;
  }
}
