import type { Readable } from "node:stream";
import type { StartedNetwork } from "./network/network";
import type {
  ArchiveToCopy,
  BindMount,
  CommitOptions,
  ContentToCopy,
  CopyToContainerOptions,
  DirectoryToCopy,
  Environment,
  ExecOptions,
  ExecResult,
  ExtraHost,
  FileToCopy,
  Labels,
  ResourcesQuota,
  TmpFs,
  Ulimits,
} from "./types";
import type { PortWithOptionalBinding } from "./utils/port";
import type { ImagePullPolicy } from "./utils/pull-policy";
import type { WaitStrategy } from "./wait-strategies/wait-strategy";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnvironment(environment: Environment): this;
  withCommand(command: string[]): this;
  withEntrypoint(entrypoint: string[]): this;
  withTmpFs(tmpFs: TmpFs): this;
  withUlimits(ulimits: Ulimits): this;
  withSecurityOpt(...securityOptions: string[]): this;
  withAddedCapabilities(...capabilities: string[]): this;
  withDroppedCapabilities(...capabilities: string[]): this;
  withExposedPorts(...ports: PortWithOptionalBinding[]): this;
  withBindMounts(bindMounts: BindMount[]): this;
  withWaitStrategy(waitStrategy: WaitStrategy): this;
  /** Container startup timeout in milliseconds. */
  withStartupTimeout(startupTimeoutMs: number): this;
  withNetwork(network: StartedNetwork): this;
  withNetworkMode(networkMode: string): this;
  withExtraHosts(extraHosts: ExtraHost[]): this;
  withDefaultLogDriver(): this;
  withPrivilegedMode(): this;
  withPlatform(platform: string): this;
  withUser(user: string): this;
  withPullPolicy(pullPolicy: ImagePullPolicy): this;
  withReuse(): this;
  withAutoCleanup(autoCleanup: boolean): this;
  withAutoRemove(autoRemove: boolean): this;
  withCopyFilesToContainer(filesToCopy: FileToCopy[]): this;
  withCopyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): this;
  withCopyContentToContainer(contentsToCopy: ContentToCopy[]): this;
  withCopyArchivesToContainer(archivesToCopy: ArchiveToCopy[]): this;
  withCopyToContainerOptions(copyToContainerOptions: CopyToContainerOptions): this;
  withWorkingDir(workingDir: string): this;
  /** Resource limits. `memory` is gigabytes; `cpu` is CPUs. */
  withResourcesQuota(resourcesQuota: ResourcesQuota): this;
  /** `/dev/shm` size in bytes. */
  withSharedMemorySize(bytes: number): this;
  withLogConsumer(logConsumer: (stream: Readable) => unknown): this;
  withHostname(hostname: string): this;
}

export interface RestartOptions {
  /** Stop timeout before restart, in milliseconds. */
  timeout: number;
}

export interface StopOptions {
  /** Stop timeout in milliseconds. */
  timeout: number;
  remove: boolean;
  removeVolumes: boolean;
}

export interface StartedTestContainer extends AsyncDisposable {
  stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;
  restart(options?: Partial<RestartOptions>): Promise<void>;
  commit(options: CommitOptions): Promise<string>;
  getHost(): string;
  getHostname(): string;
  getFirstMappedPort(): number;
  getMappedPort(port: number, protocol?: string): number;
  getMappedPort(portWithProtocol: `${number}/${"tcp" | "udp"}`): number;
  getName(): string;
  getLabels(): Labels;
  getId(): string;
  getNetworkNames(): string[];
  getNetworkId(networkName: string): string;
  getIpAddress(networkName: string): string;
  copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream>;
  copyArchiveToContainer(tar: Readable, target?: string, options?: CopyToContainerOptions): Promise<void>;
  copyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): Promise<void>;
  copyFilesToContainer(filesToCopy: FileToCopy[]): Promise<void>;
  copyContentToContainer(contentsToCopy: ContentToCopy[]): Promise<void>;
  exec(command: string | string[], opts?: Partial<ExecOptions>): Promise<ExecResult>;
  /**
   * Stream container logs.
   * @param opts.since Unix timestamp in **seconds**, or a `Date` (converted to seconds). Millisecond values such as `Date.now()` are far in the future for Docker.
   * @param opts.tail Number of lines from the end of the logs, or omit for the full stream.
   */
  logs(opts?: { since?: number | Date; tail?: number }): Promise<Readable>;
}

export interface StoppedTestContainer {
  getId(): string;

  copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream>;
}
