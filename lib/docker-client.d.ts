import Dockerode, { Container } from "dockerode";
import { StartedPortBindings } from "./port-bindings";
export interface DockerClient {
    pull(image: string): Promise<void>;
    create(image: string, portBindings: StartedPortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
}
export declare class DockerodeClient implements DockerClient {
    private dockerode;
    constructor(dockerode?: Dockerode);
    pull(image: string): Promise<void>;
    create(image: string, portBindings: StartedPortBindings): Promise<Dockerode.Container>;
    start(container: Dockerode.Container): Promise<void>;
}
