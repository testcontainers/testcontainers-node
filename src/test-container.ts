import { Duration } from "node-duration";
import { EnvKey, EnvValue } from "./docker-client";
import { Host } from "./docker-client-factory";
import { Port } from "./port";
import { WaitStrategy } from "./wait-strategy";

export interface TestContainer {
  start(): Promise<StartedTestContainer>;
  withEnv(key: EnvKey, value: EnvValue): TestContainer;
  withExposedPorts(...ports: Port[]): TestContainer;
  withWaitStrategy(waitStrategy: WaitStrategy): TestContainer;
  withStartupTimeout(startupTimeout: Duration): TestContainer;
  withName(name: string): TestContainer;
  withNetwork(network: string): TestContainer;
  withHostname(hostname: string): TestContainer;
}

export interface StartedTestContainer {
  getId(): string;
  stop(): Promise<StoppedTestContainer>;
  getContainerIpAddress(): Host;
  getMappedPort(port: Port): Port;
}

export interface StoppedTestContainer {}
