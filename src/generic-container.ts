import { Container } from "dockerode";
import { DockerClient, DockerodeClient } from "./docker-client";
import { BoundPortBindings, PortBindings } from "./port-bindings";
import { RepoTag } from "./repo-tag";
import { StartedTestContainer, StoppedTestContainer, TestContainer } from "./test-container";

export class GenericContainer implements TestContainer {
    private readonly repoTag: RepoTag;
    private readonly dockerClient: DockerClient = new DockerodeClient();
    private readonly ports: number[] = [];

    constructor(readonly image: string, readonly tag: string = "latest") {
        this.repoTag = new RepoTag(image, tag);
    }

    public async start(): Promise<StartedTestContainer> {
        await this.dockerClient.pull(this.repoTag);
        const portBindings = await new PortBindings().bind(this.ports);
        const container = await this.dockerClient.create(this.repoTag, portBindings);
        await this.dockerClient.start(container);
        return new StartedGenericContainer(container, portBindings);
    }

    public withExposedPorts(...ports: number[]): TestContainer {
        this.ports.push(...ports);
        return this;
    }
}

class StartedGenericContainer implements StartedTestContainer {
    constructor(private readonly container: Container, private readonly portBindings: BoundPortBindings) {}

    public async stop(): Promise<StoppedTestContainer> {
        await this.container.stop();
        await this.container.remove();
        return new StoppedGenericContainer();
    }

    public getMappedPort(port: number): number {
        return this.portBindings.getMappedPort(port);
    }
}

class StoppedGenericContainer implements StoppedTestContainer {}
