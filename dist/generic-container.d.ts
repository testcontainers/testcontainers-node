import { Duration } from "node-duration";
import { Port } from "./port";
import { Image, Tag } from "./repo-tag";
import { StartedTestContainer, TestContainer } from "./test-container";
export declare class GenericContainer implements TestContainer {
    readonly image: Image;
    readonly tag: Tag;
    private readonly repoTag;
    private readonly dockerClient;
    private ports;
    private waitStrategy;
    constructor(image: Image, tag?: Tag);
    start(): Promise<StartedTestContainer>;
    withExposedPorts(...ports: Port[]): TestContainer;
    withStartupTimeout(startupTimeout: Duration): TestContainer;
}
