import archiver from "archiver";
import AsyncLock from "async-lock";
import { BoundPorts } from "../bound-ports";
import { log } from "@testcontainers/logger";
import { getContainerPort, hasHostBinding, PortWithOptionalBinding } from "../port";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { StartedTestContainer, TestContainer } from "../test-container";
import { WaitStrategy } from "../wait-strategy/wait-strategy";
import { PortForwarderInstance, SSHD_IMAGE } from "../port-forwarder";
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
} from "../types";
import { GenericContainerBuilder } from "./generic-container-builder";
import { StartedGenericContainer } from "./started-generic-container";
import {
  LABEL_TESTCONTAINERS,
  LABEL_TESTCONTAINERS_CONTAINER_HASH,
  LABEL_TESTCONTAINERS_LANG,
  LABEL_TESTCONTAINERS_SESSION_ID,
  LABEL_TESTCONTAINERS_VERSION,
} from "../labels";
import { StartedNetwork } from "../network";
import { Wait } from "../wait-strategy/wait";
import { Readable } from "stream";
import { ContainerRuntimeClient, getContainerRuntimeClient, ImageName } from "@testcontainers/container-runtime";
import { Container, ContainerCreateOptions, ContainerInspectInfo, HostConfig } from "dockerode";
import { hash } from "@testcontainers/common";
import { containerLog } from "../logger";
import { getReaper, REAPER_IMAGE } from "../reaper";
import { version } from "../../package.json";
import { waitForContainer } from "../wait-strategy/wait-for-container";

const reusableContainerCreationLock = new AsyncLock();

export class GenericContainer implements TestContainer {
  public static fromDockerfile(context: string, dockerfileName = "Dockerfile"): GenericContainerBuilder {
    return new GenericContainerBuilder(context, dockerfileName);
  }

  protected createOpts: ContainerCreateOptions;
  protected hostConfig: HostConfig = {};

  protected imageName: ImageName;
  protected startupTimeout?: number;
  protected waitStrategy: WaitStrategy = Wait.forListeningPorts();
  protected exposedPorts: PortWithOptionalBinding[] = [];
  protected reuse = false;
  protected networkMode?: string;
  protected networkAliases: string[] = [];
  protected pullPolicy: PullPolicy = new DefaultPullPolicy();
  protected logConsumer?: (stream: Readable) => unknown;
  protected filesToCopy: FileToCopy[] = [];
  protected directoriesToCopy: DirectoryToCopy[] = [];
  protected contentsToCopy: ContentToCopy[] = [];

  constructor(image: string) {
    this.imageName = ImageName.fromString(image);
    this.createOpts = { Image: this.imageName.string };
  }

  private isHelperContainer() {
    return this.imageName.string === REAPER_IMAGE || this.imageName.string === SSHD_IMAGE;
  }

  protected beforeContainerStarted?(): Promise<void>;

  protected containerCreated?(containerId: string): Promise<void>;

  protected containerStarting?(inspectResult: ContainerInspectInfo, reused: boolean): Promise<void>;

  public async start(): Promise<StartedTestContainer> {
    const client = await getContainerRuntimeClient();
    await client.image.pull(this.imageName, { force: this.pullPolicy.shouldPull() });

    if (this.beforeContainerStarted) {
      await this.beforeContainerStarted();
    }

    if (!this.isHelperContainer() && PortForwarderInstance.isRunning()) {
      const portForwarder = await PortForwarderInstance.getInstance();
      this.hostConfig.ExtraHosts = [
        ...(this.hostConfig.ExtraHosts ?? []),
        `host.testcontainers.internal:${portForwarder.getIpAddress()}`,
      ];
    }
    this.hostConfig.NetworkMode = this.networkAliases.length > 0 ? undefined : this.networkMode;

    this.createOpts.Labels = {
      ...this.createOpts.Labels,
      [LABEL_TESTCONTAINERS]: "true",
      [LABEL_TESTCONTAINERS_LANG]: "node",
      [LABEL_TESTCONTAINERS_VERSION]: version,
    };

    if (this.reuse) {
      return this.reuseOrStartContainer(client);
    }

    if (!this.isHelperContainer()) {
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
      const container = await client.container.fetchByLabel(LABEL_TESTCONTAINERS_CONTAINER_HASH, containerHash);
      if (container !== undefined) {
        log.debug(`Found container to reuse with hash "${containerHash}"`, { containerId: container.id });
        return this.reuseContainer(client, container);
      }
      log.debug("No container found to reuse");
      return this.startContainer(client);
    });
  }

  private async reuseContainer(client: ContainerRuntimeClient, container: Container) {
    const inspectResult = await client.container.inspect(container);
    const boundPorts = BoundPorts.fromInspectResult(client, inspectResult).filter(this.exposedPorts);
    if (this.startupTimeout !== undefined) {
      this.waitStrategy.withStartupTimeout(this.startupTimeout);
    }

    if (this.containerStarting) {
      await this.containerStarting(inspectResult, true);
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
      await this.containerStarted(startedContainer, inspectResult, true);
    }

    return startedContainer;
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

    log.info(`Starting container for image "${this.createOpts.Image}"...`, { containerId: container.id });
    if (this.containerCreated) {
      await this.containerCreated(container.id);
    }

    await client.container.start(container);
    log.info(`Started container for image "${this.createOpts.Image}"`, { containerId: container.id });

    const inspectResult = await client.container.inspect(container);
    const boundPorts = BoundPorts.fromInspectResult(client, inspectResult).filter(this.exposedPorts);

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
      await this.containerStarting(inspectResult, false);
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
      await this.containerStarted(startedContainer, inspectResult, false);
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
    inspectResult: ContainerInspectInfo,
    reused: boolean
  ): Promise<void>;

  protected get hasExposedPorts(): boolean {
    return this.createOpts.ExposedPorts?.length !== 0;
  }

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
    this.createOpts.Env = [
      ...(this.createOpts.Env ?? []),
      ...Object.entries(environment).map(([key, value]) => `${key}=${value}`),
    ];
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
    this.exposedPorts = [...this.exposedPorts, ...ports];

    const dockerodeExposedPorts: { [port: string]: Record<string, never> } = {};
    for (const exposedPort of ports) {
      dockerodeExposedPorts[getContainerPort(exposedPort).toString()] = {};
    }

    const dockerodePortBindings: Record<string, Array<Record<string, string>>> = {};
    for (const exposedPort of ports) {
      if (hasHostBinding(exposedPort)) {
        dockerodePortBindings[exposedPort.container] = [{ HostPort: exposedPort.host.toString() }];
      } else {
        dockerodePortBindings[exposedPort] = [{ HostPort: "0" }];
      }
    }

    this.createOpts.ExposedPorts = {
      ...this.createOpts.ExposedPorts,
      ...dockerodeExposedPorts,
    };

    this.hostConfig.PortBindings = {
      ...this.hostConfig.PortBindings,
      ...dockerodePortBindings,
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

  public withPullPolicy(pullPolicy: PullPolicy): this {
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
}
