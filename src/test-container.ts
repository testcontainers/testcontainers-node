export interface TestContainer {
    start(): Promise<StartedTestContainer>;
    withExposedPorts(...ports: number[]): TestContainer;
}

export interface StartedTestContainer {
    stop(): Promise<StoppedTestContainer>;
    getMappedPort(port: number): number;
}

export interface StoppedTestContainer {}
