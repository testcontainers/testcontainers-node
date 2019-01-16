/// <reference types="node" />
import dockerode from "dockerode";
import { Command, ExitCode } from "./docker-client";
declare type Id = string;
declare type ExecOptions = {
    cmd: Command[];
    attachStdout: true;
    attachStderr: true;
};
declare type InspectResult = {
    exitCode: ExitCode;
};
interface Exec {
    start(): Promise<NodeJS.ReadableStream>;
    inspect(): Promise<InspectResult>;
}
export interface Container {
    getId(): Id;
    start(): Promise<void>;
    stop(): Promise<void>;
    remove(): Promise<void>;
    exec(options: ExecOptions): Promise<Exec>;
}
export declare class DockerodeContainer implements Container {
    private readonly container;
    constructor(container: dockerode.Container);
    getId(): Id;
    start(): Promise<void>;
    stop(): Promise<void>;
    remove(): Promise<void>;
    exec(options: ExecOptions): Promise<Exec>;
}
export {};
