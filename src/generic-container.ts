import { Duration, TemporalUnit } from "node-duration";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient, DockerodeClient } from "./docker-client";
import { Port } from "./port";
import { PortBinder, PortBindings } from "./port-bindings";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { Image, RepoTag, Tag } from "./repo-tag";
import { StartedTestContainer, StoppedTestContainer, TestContainer } from "./test-container";
import { HostPortWaitStrategy } from "./wait-strategy";

export class GenericContainer implements TestContainer {
  private readonly repoTag: RepoTag;
  private readonly dockerClient: DockerClient = new DockerodeClient();

  private ports: Port[] = [];
  private startupTimeout: Duration = new Duration(10_000, TemporalUnit.MILLISECONDS);

  constructor(readonly image: Image, readonly tag: Tag = "latest") {
    this.repoTag = new RepoTag(image, tag);
  }

  public async start(): Promise<StartedTestContainer> {
    if (!(await this.hasRepoTagLocally())) {
      await this.dockerClient.pull(this.repoTag);
    }

    const portBindings = await new PortBinder().bind(this.ports);
    const container = await this.dockerClient.create(this.repoTag, portBindings);
    await this.dockerClient.start(container);
    const inspectResult = await container.inspect();
    const containerState = new ContainerState(inspectResult);
    await this.waitForContainer(container, containerState);

    return new StartedGenericContainer(container, portBindings);
  }

  public withExposedPorts(...ports: Port[]): TestContainer {
    this.ports = ports;
    return this;
  }

  public withStartupTimeout(startupTimeout: Duration): TestContainer {
    this.startupTimeout = startupTimeout;
    return this;
  }

  private async hasRepoTagLocally(): Promise<boolean> {
    const repoTags = await this.dockerClient.fetchRepoTags();
    return repoTags.some(repoTag => repoTag.equals(this.repoTag));
  }

  private async waitForContainer(container: Container, containerState: ContainerState): Promise<void> {
    const hostPortCheck = new HostPortCheck();
    const internalPortCheck = new InternalPortCheck(container, this.dockerClient);
    const waitStrategy = new HostPortWaitStrategy(this.dockerClient, hostPortCheck, internalPortCheck);
    await waitStrategy.waitUntilReady(containerState);
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
