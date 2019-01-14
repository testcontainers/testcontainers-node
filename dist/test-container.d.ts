import { Duration } from "node-duration";
import { Port } from "./port";
export interface TestContainer {
    start(): Promise<StartedTestContainer>;
    withExposedPorts(...ports: Port[]): TestContainer;
    withStartupTimeout(startupTimeout: Duration): TestContainer;
}
export interface StartedTestContainer {
    stop(): Promise<StoppedTestContainer>;
    getMappedPort(port: Port): Port;
}
export interface StoppedTestContainer {
}
