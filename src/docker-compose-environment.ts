import * as dockerCompose from "docker-compose";
import Dockerode from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import { DockerClientFactory } from "./docker-client-factory";
import { resolveDockerComposeContainerName } from "./docker-compose-container-name-resolver";
import { StartedGenericContainer } from "./generic-container";
import { log, containerLog } from "./logger";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";
import { Reaper } from "./reaper";
import { RandomUuid, Uuid } from "./uuid";

const defaultDockerComposeOptions = (
  composeFilePath: string,
  composeFile: string,
  projectName: string
): Partial<dockerCompose.IDockerComposeOptions> => ({
  log: false,
  cwd: composeFilePath,
  config: composeFile,
  env: {
    ...process.env,
    COMPOSE_PROJECT_NAME: projectName,
  },
});

export class DockerComposeEnvironment {
  private readonly projectName: string;

  private build = false;
  private waitStrategy: { [containerName: string]: WaitStrategy } = {};
  private startupTimeout: Duration = new Duration(60_000, TemporalUnit.MILLISECONDS);

  constructor(
    private readonly composeFilePath: string,
    private readonly composeFile: string,
    uuid: Uuid = new RandomUuid()
  ) {
    this.projectName = `testcontainers-${uuid.nextUuid()}`;
  }

  public withBuild(): this {
    this.build = true;
    return this;
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
    log.info(`Starting DockerCompose environment`);

    const dockerClient = await DockerClientFactory.getClient();

    (await Reaper.start(dockerClient)).addProject(this.projectName);

    await this.dockerComposeUp();
    const startedContainers = (await dockerClient.listContainers()).filter(
      (container) => container.Labels["com.docker.compose.project"] === this.projectName
    );

    const startedGenericContainers = (
      await Promise.all(
        startedContainers.map(async (startedContainer) => {
          const container = await dockerClient.getContainer(startedContainer.Id);
          const containerName = resolveDockerComposeContainerName(this.projectName, startedContainer.Names[0]);

          (await container.logs())
            .on("data", (data) => containerLog.trace(`${containerName}: ${data}`))
            .on("err", (data) => containerLog.error(`${containerName}: ${data}`));

          const inspectResult = await container.inspect();
          const boundPorts = this.getBoundPorts(startedContainer);
          const containerState = new ContainerState(inspectResult);

          await this.waitForContainer(dockerClient, container, containerName, containerState, boundPorts);

          return new StartedGenericContainer(
            container,
            dockerClient.getHost(),
            boundPorts,
            containerName,
            dockerClient
          );
        })
      )
    ).reduce((map, startedGenericContainer) => {
      const containerName = startedGenericContainer.getName();
      return { ...map, [containerName]: startedGenericContainer };
    }, {});

    log.info(`DockerCompose environment started: ${Object.keys(startedGenericContainers).join(", ")}`);

    return new StartedDockerComposeEnvironment(
      this.composeFilePath,
      this.composeFile,
      this.projectName,
      startedGenericContainers
    );
  }

  private async dockerComposeUp() {
    try {
      await dockerCompose.upAll(this.createDockerComposeOptions());
    } catch ({ err }) {
      log.error(`Failed to start DockerCompose environment: ${err}`);
      try {
        await dockerCompose.down(this.createDockerComposeOptions());
      } catch {
        log.warn(`Failed to stop DockerCompose environment after failed start`);
      }
      throw new Error(err.trim());
    }
  }

  private createDockerComposeOptions(): dockerCompose.IDockerComposeOptions {
    const commandOptions = [];
    if (this.build) {
      commandOptions.push("--build");
    }

    return {
      ...defaultDockerComposeOptions(this.composeFilePath, this.composeFile, this.projectName),
      commandOptions,
    };
  }

  private getBoundPorts(containerInfo: Dockerode.ContainerInfo): BoundPorts {
    const boundPorts = new BoundPorts();
    containerInfo.Ports.forEach((port) => boundPorts.setBinding(port.PrivatePort, port.PublicPort));
    return boundPorts;
  }

  private async waitForContainer(
    dockerClient: DockerClient,
    container: Container,
    containerName: string,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    log.debug("Waiting for container to be ready");
    const waitStrategy = this.getWaitStrategy(dockerClient, container, containerName);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
    log.info("Container is ready");
  }

  private getWaitStrategy(dockerClient: DockerClient, container: Container, containerName: string): WaitStrategy {
    if (this.waitStrategy[containerName]) {
      return this.waitStrategy[containerName];
    } else {
      const hostPortCheck = new HostPortCheck(dockerClient.getHost());
      const internalPortCheck = new InternalPortCheck(container, dockerClient);
      return new HostPortWaitStrategy(dockerClient, hostPortCheck, internalPortCheck);
    }
  }
}

export class StartedDockerComposeEnvironment {
  constructor(
    private readonly composeFilePath: string,
    private readonly composeFile: string,
    private readonly projectName: string,
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer }
  ) {}

  public async down(): Promise<StoppedDockerComposeEnvironment> {
    log.info(`Stopping DockerCompose environment`);
    try {
      await dockerCompose.down(defaultDockerComposeOptions(this.composeFilePath, this.composeFile, this.projectName));
      return new StoppedDockerComposeEnvironment();
    } catch ({ err }) {
      log.error(`Failed to stop DockerCompose environment: ${err}`);
      throw new Error(err.trim());
    }
  }

  public getContainer(containerName: string): StartedGenericContainer {
    const container = this.startedGenericContainers[containerName];
    if (!container) {
      const error = `Cannot get container "${containerName}" as it is not running`;
      log.error(error);
      throw new Error(error);
    }
    return container;
  }
}

export class StoppedDockerComposeEnvironment {}
