import { Port, PortWithOptionalBinding } from "./port";
import { PullPolicy } from "./pull-policy";
import { WaitStrategy } from "./wait-strategy";
import { Readable } from "stream";
import {
  BindMode,
  Command,
  ContainerName,
  Dir,
  EnvKey,
  EnvValue,
  ExecResult,
  ExtraHost,
  Host,
  Id,
  NetworkMode,
  TmpFs,
  Labels,
} from "./docker/types";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;

  withEnv(key: EnvKey, value: EnvValue): this;

  withCmd(cmd: Command[]): this;

  withTmpFs(tmpFs: TmpFs): this;

  withExposedPorts(...ports: PortWithOptionalBinding[]): this;

  withBindMount(source: Dir, target: Dir, bindMode: BindMode): this;

  withWaitStrategy(waitStrategy: WaitStrategy): this;

  withStartupTimeout(startupTimeout: number): this;

  withNetworkMode(networkMode: NetworkMode): this;

  withExtraHosts(...extraHosts: ExtraHost[]): this;

  withDefaultLogDriver(): this;

  withPrivilegedMode(): this;

  withUser(user: string): this;

  withPullPolicy(pullPolicy: PullPolicy): this;

  withReuse(): this;

  withCopyFileToContainer(sourcePath: string, containerPath: string): this;

  withCopyContentToContainer(content: string | Buffer | Readable, containerPath: string): this;
}

export interface RestartOptions {
  timeout: number;
}

export interface StopOptions {
  timeout: number;
  removeVolumes: boolean;
}

export interface ExecOptions {
  Tty: boolean;
  Detach: boolean;
  stdin: boolean;
}

export interface StartedTestContainer {
  stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;

  restart(options?: Partial<RestartOptions>): Promise<void>;

  getHost(): Host;

  getMappedPort(port: Port): Port;

  getName(): ContainerName;

  getLabels(): Labels;

  getId(): Id;

  getNetworkNames(): string[];

  getNetworkId(networkName: string): string;

  getIpAddress(networkName: string): string;

  exec(command: Command[]): Promise<ExecResult>;

  logs(): Promise<Readable>;
}

export interface StoppedTestContainer {}
