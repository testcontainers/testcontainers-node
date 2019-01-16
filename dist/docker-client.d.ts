import Dockerode from "dockerode";
import { Container } from "./container";
import { Logger } from "./logger";
import { PortBindings } from "./port-bindings";
import { RepoTag } from "./repo-tag";
export declare type Command = string;
export declare type ExitCode = number;
declare type StreamOutput = string;
declare type ExecResult = {
    output: StreamOutput;
    exitCode: ExitCode;
};
export interface DockerClient {
    pull(repoTag: RepoTag): Promise<void>;
    create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
    exec(container: Container, command: Command[]): Promise<ExecResult>;
    fetchRepoTags(): Promise<RepoTag[]>;
}
export declare class DockerodeClient implements DockerClient {
    private readonly dockerode;
    private readonly log;
    constructor(dockerode?: Dockerode, log?: Logger);
    pull(repoTag: RepoTag): Promise<void>;
    create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
    exec(container: Container, command: Command[]): Promise<ExecResult>;
    fetchRepoTags(): Promise<RepoTag[]>;
    private getExposedPorts;
    private getPortBindings;
}
export {};
