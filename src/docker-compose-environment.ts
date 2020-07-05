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
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";

const createDockerComposeOptions = (filePath: string, fileName: string): dockerCompose.IDockerComposeOptions => ({
  cwd: filePath,
  config: fileName,
  log: false
});

export class DockerComposeEnvironment {
  private readonly dockerClient: DockerClient;

  private waitStrategy: { [containerName: string]: WaitStrategy } = {};
  private startupTimeout: Duration = new Duration(60_000, TemporalUnit.MILLISECONDS);

  constructor(private readonly composeFilePath: string, private readonly composeFile: string) {
    this.dockerClient = new DockerodeClientFactory().getClient();
  }

  public withWaitStrategy(containerName: string, waitStrategy: WaitStrategy): this {
    this.waitStrategy[containerName] = waitStrategy;
    return this;
  }

  public withStartupTimeout(startupTimeout: Duration): this {
    this.startupTimeout = startupTimeout;
    return this;
  }

  public async up(): Promise<StartedDockerComposeEnvironment> {
    log.info(`Starting docker-compose environment`);

    await this.dockerComposeUp();
    const startedContainers = await this.findStartedContainers();

    const startedGenericContainers = (await Promise.all(
      startedContainers.map(async startedContainer => {
        const container = await this.dockerClient.getContainer(startedContainer.Id);
        const containerName = this.getContainerName(startedContainer);

        (await container.logs())
          .on("data", data => log.trace(`${containerName}: ${data}`))
          .on("err", data => log.error(`${containerName}: ${data}`));

        const inspectResult = await container.inspect();
        const boundPorts = this.getBoundPorts(startedContainer);

        const containerState = new ContainerState(inspectResult);

        await this.waitForContainer(container, containerName, containerState, boundPorts);
        return new StartedGenericContainer(
          await this.dockerClient.getContainer(startedContainer.Id),
          this.dockerClient.getHost(),
          boundPorts,
          containerName,
          this.dockerClient
        );
      })
    )).reduce((map, startedGenericContainer) => {
      const containerName = startedGenericContainer.getName();
      return { ...map, [containerName]: startedGenericContainer };
    }, {});

    return new StartedDockerComposeEnvironment(this.composeFilePath, this.composeFile, startedGenericContainers);
  }

  private async dockerComposeUp() {
    try {
      await dockerCompose.upAll(createDockerComposeOptions(this.composeFilePath, this.composeFile));
    } catch ({ err }) {
      log.error(`Failed to start docker-compose environment: ${err}`);
      try {
        await dockerCompose.down(createDockerComposeOptions(this.composeFilePath, this.composeFile));
      } catch {
        log.warn(`Failed to stop docker-compose environment after failed start`);
      }
      throw new Error(err.trim());
    }
  }

  private async findStartedContainers(): Promise<Dockerode.ContainerInfo[]> {
    const containers = await this.dockerClient.listContainers();
    return containers.filter(container => container.Labels["com.docker.compose.version"] !== undefined);
  }

  private getBoundPorts(containerInfo: Dockerode.ContainerInfo): BoundPorts {
    const boundPorts = new BoundPorts();
    containerInfo.Ports.forEach(port => boundPorts.setBinding(port.PrivatePort, port.PublicPort));
    return boundPorts;
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
    containerName: string,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug("Waiting for container to be ready");
    const waitStrategy = this.getWaitStrategy(container, containerName);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
    log.info("Container is ready");
  }

  private getWaitStrategy(container: Container, containerName: string): WaitStrategy {
    if (this.waitStrategy[containerName]) {
      return this.waitStrategy[containerName];
    } else {
      const hostPortCheck = new HostPortCheck(this.dockerClient.getHost());
      const internalPortCheck = new InternalPortCheck(container, this.dockerClient);
      return new HostPortWaitStrategy(this.dockerClient, hostPortCheck, internalPortCheck);
    }
  }
}

export class StartedDockerComposeEnvironment {
  constructor(
    private readonly composeFilePath: string,
    private readonly composeFile: string,
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer }
  ) {}

  public async down(): Promise<StoppedDockerComposeEnvironment> {
    log.info(`Stopping docker-compose environment`);
    try {
      await dockerCompose.down(createDockerComposeOptions(this.composeFilePath, this.composeFile));
      return new StoppedDockerComposeEnvironment();
    } catch ({ err }) {
      log.error(`Failed to stop docker-compose environment: ${err}`);
      throw new Error(err.trim());
    }
  }

  public getContainer(containerName: string): StartedGenericContainer {
    return this.startedGenericContainers[containerName];
  }
}

export class StoppedDockerComposeEnvironment {}
