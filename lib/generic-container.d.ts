import { StartedTestContainer, TestContainer } from "./test-container";
export declare class GenericContainer implements TestContainer {
    private image;
    private readonly dockerClient;
    private readonly ports;
    constructor(image: string);
    start(): Promise<StartedTestContainer>;
    withExposedPorts(...ports: number[]): TestContainer;
}
