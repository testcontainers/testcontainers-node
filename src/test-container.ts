import { Duration } from "node-duration";
import { Command, EnvKey, EnvValue, ExecResult, TmpFs } from "./docker-client";
import { Host } from "./docker-client-factory";
import { Port } from "./port";
import { WaitStrategy } from "./wait-strategy";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnv(key: EnvKey, value: EnvValue): TestContainer;
  withCmd(cmd: Command[]): TestContainer;
  withTmpFs(tmpFs: TmpFs): TestContainer;
  withExposedPorts(...ports: Port[]): TestContainer;
  withWaitStrategy(waitStrategy: WaitStrategy): TestContainer;
  withStartupTimeout(startupTimeout: Duration): TestContainer;
}

export interface StartedTestContainer {
  stop(): Promise<StoppedTestContainer>;
  getContainerIpAddress(): Host;
  getMappedPort(port: Port): Port;
  exec(command: Command[]): Promise<ExecResult>;
}

export interface StoppedTestContainer {}
