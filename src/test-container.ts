import { Duration } from "node-duration";
import { EnvironmentKey, EnvironmentValue } from "./docker-client";
import { Port } from "./port";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnv(key: EnvironmentKey, value: EnvironmentValue): TestContainer;
  withExposedPorts(...ports: Port[]): TestContainer;
  withStartupTimeout(startupTimeout: Duration): TestContainer;
}

export interface StartedTestContainer {
  stop(): Promise<StoppedTestContainer>;
  getMappedPort(port: Port): Port;
}

export interface StoppedTestContainer {}
