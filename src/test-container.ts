import { PortWithOptionalBinding } from "./port";
import { PullPolicy } from "./pull-policy";
import { WaitStrategy } from "./wait-strategy/wait-strategy";
import { Readable } from "stream";
import {
  BindMount,
  ContentToCopy,
  Environment,
  ExecResult,
  ExtraHost,
  FileToCopy,
  Labels,
  ResourcesQuota,
  TmpFs,
  Ulimits,
} from "./docker/types";
import { StartedNetwork } from "./network";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnvironment(environment: Environment): this;
  withCommand(command: string[]): this;
  withEntrypoint(entrypoint: string[]): this;
  withTmpFs(tmpFs: TmpFs): this;
  withUlimits(ulimits: Ulimits): this;
  withAddedCapabilities(...capabilities: string[]): this;
  withDroppedCapabilities(...capabilities: string[]): this;
  withExposedPorts(...ports: PortWithOptionalBinding[]): this;
  withBindMounts(bindMounts: BindMount[]): this;
  withWaitStrategy(waitStrategy: WaitStrategy): this;
  withStartupTimeout(startupTimeoutMs: number): this;
  withNetwork(network: StartedNetwork): this;
  withNetworkMode(networkMode: string): this;
  withExtraHosts(extraHosts: ExtraHost[]): this;
  withDefaultLogDriver(): this;
  withPrivilegedMode(): this;
  withUser(user: string): this;
  withPullPolicy(pullPolicy: PullPolicy): this;
  withReuse(): this;
  withCopyFilesToContainer(filesToCopy: FileToCopy[]): this;
  withCopyContentToContainer(contentsToCopy: ContentToCopy[]): this;
  withWorkingDir(workingDir: string): this;
  withResourcesQuota(resourcesQuota: ResourcesQuota): this;
  withSharedMemorySize(bytes: number): this;
  withLogConsumer(logConsumer: (stream: Readable) => unknown): this;
}

export interface RestartOptions {
  timeout: number;
}

export interface StopOptions {
  timeout: number;
  removeContainer: boolean;
  removeVolumes: boolean;
}

export interface DockerComposeDownOptions {
  timeout: number;
  removeVolumes: boolean;
}

export interface StartedTestContainer {
  stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;
  restart(options?: Partial<RestartOptions>): Promise<void>;
  getHost(): string;
  getFirstMappedPort(): number;
  getMappedPort(port: number): number;
  getName(): string;
  getLabels(): Labels;
  getId(): string;
  getNetworkNames(): string[];
  getNetworkId(networkName: string): string;
  getIpAddress(networkName: string): string;
  getArchive(path: string): Promise<NodeJS.ReadableStream>;
  exec(command: string[]): Promise<ExecResult>;
  logs(): Promise<Readable>;
}

export interface StoppedTestContainer {
  getId(): string;
  getArchive(path: string): Promise<NodeJS.ReadableStream>;
}
