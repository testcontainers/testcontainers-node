import { Id } from "./container";
import {
  AuthConfig,
  BindMode,
  Command,
  ContainerName,
  Dir,
  EnvKey,
  EnvValue,
  ExecResult,
  NetworkMode,
  TmpFs,
} from "./docker-client";
import { Host } from "./docker-client-factory";
import { Port } from "./port";
import { PullPolicy } from "./pull-policy";
import { WaitStrategy } from "./wait-strategy";
import { Readable } from "stream";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnv(key: EnvKey, value: EnvValue): this;
  withCmd(cmd: Command[]): this;
  withTmpFs(tmpFs: TmpFs): this;
  withExposedPorts(...ports: Port[]): this;
  withBindMount(source: Dir, target: Dir, bindMode: BindMode): this;
  withWaitStrategy(waitStrategy: WaitStrategy): this;
  withStartupTimeout(startupTimeout: number): this;
  withNetworkMode(networkMode: NetworkMode): this;
  withDefaultLogDriver(): this;
  withPrivilegedMode(): this;
  withPullPolicy(pullPolicy: PullPolicy): this;
  withAuthentication(authConfig: AuthConfig): this;
}

export interface StopOptions {
  timeout: number;
  removeVolumes: boolean;
}

export const DEFAULT_STOP_OPTIONS: StopOptions = {
  timeout: 0,
  removeVolumes: true,
};

export interface StartedTestContainer {
  stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;
  getContainerIpAddress(): Host;
  getMappedPort(port: Port): Port;
  getName(): ContainerName;
  getId(): Id;
  exec(command: Command[]): Promise<ExecResult>;
  logs(): Promise<Readable>;
}

export interface StoppedTestContainer {}
