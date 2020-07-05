import * as dockerCompose from "docker-compose";
import Dockerode from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import { DockerodeClientFactory } from "./docker-client-factory";
import { StartedGenericContainer } from "./generic-container";
import log from "./logger";
import { Port } from "./port";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

export class DockerComposeEnvironment {
  private startupTimeout: Duration = new Duration(60_000, TemporalUnit.MILLISECONDS);

  constructor(
    private readonly composeFilePath: string,
    private readonly composeFile: string,
    private readonly dockerClient: DockerClient = new DockerodeClientFactory().getClient()
  ) {}

  public async start(): Promise<StartedDockerComposeEnvironment> {
    try {
      await this.dockerComposeUp();
      const startedContainers = await this.findStartedContainers();

      const startedGenericContainers = (await Promise.all(
        startedContainers.map(async startedContainer => {
          const container = await this.dockerClient.getContainer(startedContainer.Id);
          const inspectResult = await container.inspect();
          const containerState = new ContainerState(inspectResult);

          const boundPorts = new BoundPorts();
          startedContainer.Ports.forEach(port => boundPorts.setBinding(port.PrivatePort, port.PublicPort));

          await this.waitForContainer(container, containerState, boundPorts);

          return new StartedGenericContainer(
            await this.dockerClient.getContainer(startedContainer.Id),
            this.dockerClient.getHost(),
            boundPorts,
            this.getContainerName(startedContainer),
            this.dockerClient
          );
        })
      )).reduce((map, startedGenericContainer) => {
        const containerName = startedGenericContainer.getName();
        return { ...map, [containerName]: startedGenericContainer };
      }, {});

      return new StartedDockerComposeEnvironment(startedGenericContainers);
    } catch ({ err }) {
      throw new Error(err.trim());
    }
  }

  private async dockerComposeUp() {
    const options = { cwd: this.composeFilePath, config: this.composeFile, log: true };
    await dockerCompose.upAll(options);
  }

  private async findStartedContainers(): Promise<Dockerode.ContainerInfo[]> {
    const containers = await this.dockerClient.listContainers();
    return containers.filter(container => container.Labels["com.docker.compose.version"] !== undefined);
  }

  private getContainerName(container: Dockerode.ContainerInfo): string {
    const containerName = container.Names[0];
    const matches = containerName.match(/^.*docker-compose_(.*$)/);
    if (!matches) {
      throw new Error(`Unable to compute container name for: "${containerName}"`);
    }
    return matches[1];
  }

  private async waitForContainer(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug("Waiting for container to be ready");
    const waitStrategy = this.getWaitStrategy(container);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
    log.info("Container is ready");
  }

  private getWaitStrategy(container: Container): WaitStrategy {
    const hostPortCheck = new HostPortCheck(this.dockerClient.getHost());
    const internalPortCheck = new InternalPortCheck(container, this.dockerClient);
    return new HostPortWaitStrategy(this.dockerClient, hostPortCheck, internalPortCheck);
  }
}

export class StartedDockerComposeEnvironment {
  constructor(private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer }) {}

  public getContainerIpAddress(containerName: string) {
    return this.startedGenericContainers[containerName].getContainerIpAddress();
  }

  public getMappedPort(containerName: string, port: Port): Port {
    return this.startedGenericContainers[containerName].getMappedPort(port);
  }
}
