import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient, DockerodeClient, Env, EnvKey, EnvValue } from "./docker-client";
import log from "./logger";
import { Port } from "./port";
import { PortBinder } from "./port-binder";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { Image, RepoTag, Tag } from "./repo-tag";
import { StartedTestContainer, StoppedTestContainer, TestContainer } from "./test-container";
import { HostPortWaitStrategy } from "./wait-strategy";

export class GenericContainer implements TestContainer {
  private readonly repoTag: RepoTag;
  private readonly dockerClient: DockerClient = new DockerodeClient();

  private env: Env = {};
  private ports: Port[] = [];
  private startupTimeout: Duration = new Duration(30_000, TemporalUnit.MILLISECONDS);

  constructor(readonly image: Image, readonly tag: Tag = "latest") {
    this.repoTag = new RepoTag(image, tag);
  }

  public async start(): Promise<StartedTestContainer> {
    if (!(await this.hasRepoTagLocally())) {
      await this.dockerClient.pull(this.repoTag);
    }

    const boundPorts = await new PortBinder().bind(this.ports);
    const container = await this.dockerClient.create(this.repoTag, this.env, boundPorts);
    await this.dockerClient.start(container);
    const inspectResult = await container.inspect();
    const containerState = new ContainerState(inspectResult);
    await this.waitForContainer(container, containerState, boundPorts);

    return new StartedGenericContainer(container, boundPorts);
  }

  public withEnv(key: EnvKey, value: EnvValue): TestContainer {
    this.env[key] = value;
    return this;
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

  private async waitForContainer(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug("Starting container health checks");
    const hostPortCheck = new HostPortCheck(this.dockerClient);
    const internalPortCheck = new InternalPortCheck(container, this.dockerClient);
    const waitStrategy = new HostPortWaitStrategy(this.dockerClient, hostPortCheck, internalPortCheck);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(containerState, boundPorts);
    log.debug("Container health checks complete");
  }
}

class StartedGenericContainer implements StartedTestContainer {
  constructor(private readonly container: Container, private readonly boundPorts: BoundPorts) {}

  public async stop(): Promise<StoppedTestContainer> {
    await this.container.stop();
    await this.container.remove();
    return new StoppedGenericContainer();
  }

  public getMappedPort(port: Port): Port {
    return this.boundPorts.getBinding(port);
  }
}

class StoppedGenericContainer implements StoppedTestContainer {}
