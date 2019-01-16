/// <reference types="node" />
import dockerode from "dockerode";
import { Command, ExitCode } from "./docker-client";
import { Port } from "./port";
declare type Id = string;
export declare type InspectResult = {
    internalPorts: Port[];
    hostPorts: Port[];
};
declare type ExecOptions = {
    cmd: Command[];
    attachStdout: true;
    attachStderr: true;
};
declare type ExecInspectResult = {
    exitCode: ExitCode;
};
interface Exec {
    start(): Promise<NodeJS.ReadableStream>;
    inspect(): Promise<ExecInspectResult>;
}
export interface Container {
    getId(): Id;
    start(): Promise<void>;
    stop(): Promise<void>;
    remove(): Promise<void>;
    exec(options: ExecOptions): Promise<Exec>;
    inspect(): Promise<InspectResult>;
}
export declare class DockerodeContainer implements Container {
    private readonly container;
    constructor(container: dockerode.Container);
    getId(): Id;
    start(): Promise<void>;
    stop(): Promise<void>;
    remove(): Promise<void>;
    exec(options: ExecOptions): Promise<Exec>;
    inspect(): Promise<InspectResult>;
    private getInternalPorts;
    private getHostPorts;
}
export {};
