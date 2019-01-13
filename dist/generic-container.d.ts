import { StartedTestContainer, TestContainer } from "./test-container";
export declare class GenericContainer implements TestContainer {
    readonly image: string;
    readonly tag: string;
    private readonly repoTag;
    private readonly dockerClient;
    private readonly ports;
    constructor(image: string, tag?: string);
    start(): Promise<StartedTestContainer>;
    withExposedPorts(...ports: number[]): TestContainer;
}
