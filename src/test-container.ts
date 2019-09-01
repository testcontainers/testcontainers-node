import { Duration, TemporalUnit } from "node-duration";
import { BindMode, Command, Dir, EnvKey, EnvValue, ExecResult, TmpFs } from "./docker-client";
import { Host } from "./docker-client-factory";
import { Port } from "./port";
import { WaitStrategy } from "./wait-strategy";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnv(key: EnvKey, value: EnvValue): TestContainer;
  withCmd(cmd: Command[]): TestContainer;
  withTmpFs(tmpFs: TmpFs): TestContainer;
  withExposedPorts(...ports: Port[]): TestContainer;
  withBindMount(source: Dir, target: Dir, bindMode: BindMode): TestContainer;
  withWaitStrategy(waitStrategy: WaitStrategy): TestContainer;
  withStartupTimeout(startupTimeout: Duration): TestContainer;
}

export interface OptionalStopOptions {
  timeout?: Duration;
  removeVolumes?: boolean;
}

interface StopOptions {
  timeout: Duration;
  removeVolumes: boolean;
}

export const DEFAULT_STOP_OPTIONS: StopOptions = {
  timeout: new Duration(10, TemporalUnit.SECONDS),
  removeVolumes: true
};

export interface StartedTestContainer {
  stop(options?: OptionalStopOptions): Promise<StoppedTestContainer>;
  getContainerIpAddress(): Host;
  getMappedPort(port: Port): Port;
  exec(command: Command[]): Promise<ExecResult>;
}

export interface StoppedTestContainer {}
