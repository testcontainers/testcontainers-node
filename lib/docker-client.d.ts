import Dockerode, { Container } from "dockerode";
import { BoundPortBindings } from "./port-bindings";
export interface DockerClient {
    pull(image: string): Promise<void>;
    create(image: string, portBindings: BoundPortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
}
export declare class DockerodeClient implements DockerClient {
    private readonly dockerode;
    constructor(dockerode?: Dockerode);
    pull(image: string): Promise<void>;
    create(image: string, portBindings: BoundPortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
}
