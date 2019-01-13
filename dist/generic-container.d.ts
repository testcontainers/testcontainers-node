import { StartedTestContainer, TestContainer } from "./test-container";
export declare class GenericContainer implements TestContainer {
    private readonly image;
    private readonly tag;
    private readonly dockerClient;
    private readonly ports;
    constructor(image: string, tag?: string);
    start(): Promise<StartedTestContainer>;
    withExposedPorts(...ports: number[]): TestContainer;
    private repoTag;
}
