import { Container } from "dockerode";
import { Duration } from "node-duration";
import { ContainerState } from "./container-state";
import { DockerClient, DockerodeClient } from "./docker-client";
import { Port } from "./port";
import { PortBinder, PortBindings } from "./port-bindings";
import { Image, RepoTag, Tag } from "./repo-tag";
import { StartedTestContainer, StoppedTestContainer, TestContainer } from "./test-container";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

export class GenericContainer implements TestContainer {
  private readonly repoTag: RepoTag;
  private readonly dockerClient: DockerClient = new DockerodeClient();

  private ports: Port[] = [];
  private waitStrategy: WaitStrategy = new HostPortWaitStrategy();

  constructor(readonly image: Image, readonly tag: Tag = "latest") {
    this.repoTag = new RepoTag(image, tag);
  }

  public async start(): Promise<StartedTestContainer> {
    await this.dockerClient.pull(this.repoTag);
    const portBindings = await new PortBinder().bind(this.ports);
    const container = await this.dockerClient.create(this.repoTag, portBindings);
    await this.dockerClient.start(container);
    const containerState = new ContainerState(portBindings);
    await this.waitStrategy.waitUntilReady(containerState);
    return new StartedGenericContainer(container, portBindings);
  }

  public withExposedPorts(...ports: Port[]): TestContainer {
    this.ports = ports;
    return this;
  }

  public withStartupTimeout(startupTimeout: Duration): TestContainer {
    this.waitStrategy = this.waitStrategy.withStartupTimeout(startupTimeout);
    return this;
  }
}

class StartedGenericContainer implements StartedTestContainer {
  constructor(private readonly container: Container, private readonly portBindings: PortBindings) {}

  public async stop(): Promise<StoppedTestContainer> {
    await this.container.stop();
    await this.container.remove();
    return new StoppedGenericContainer();
  }

  public getMappedPort(port: Port): Port {
    return this.portBindings.getBinding(port);
  }
}

class StoppedGenericContainer implements StoppedTestContainer {}
