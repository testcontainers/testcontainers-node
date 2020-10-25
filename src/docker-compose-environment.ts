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
import { containerLog, log } from "./logger";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";
import { ReaperFactory } from "./reaper";
import { RandomUuid, Uuid } from "./uuid";

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

    (await ReaperFactory.start(dockerClient)).addProject(this.projectName);

    await upAll(this.composeFilePath, this.composeFile, this.projectName, this.build);
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

  public async stop(): Promise<StoppedDockerComposeEnvironment> {
    await stop(this.composeFilePath, this.composeFile, this.projectName);
    return new StoppedDockerComposeEnvironment(this.composeFilePath, this.composeFile, this.projectName);
  }

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await down(this.composeFilePath, this.composeFile, this.projectName);
    return new DownedDockerComposeEnvironment();
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

export class StoppedDockerComposeEnvironment {
  constructor(
    private readonly composeFilePath: string,
    private readonly composeFile: string,
    private readonly projectName: string
  ) {}

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await down(this.composeFilePath, this.composeFile, this.projectName);
    return new DownedDockerComposeEnvironment();
  }
}

export class DownedDockerComposeEnvironment {}

const defaultDockerComposeOptions = (
  filePath: string,
  file: string,
  projectName: string
): Partial<dockerCompose.IDockerComposeOptions> => ({
  log: false,
  cwd: filePath,
  config: file,
  env: {
    ...process.env,
    COMPOSE_PROJECT_NAME: projectName,
  },
});

const upAll = async (filePath: string, file: string, projectName: string, build: boolean): Promise<void> => {
  const createOptions = (): dockerCompose.IDockerComposeOptions => {
    const commandOptions = [];
    if (build) {
      commandOptions.push("--build");
    }

    return {
      ...defaultDockerComposeOptions(filePath, file, projectName),
      commandOptions,
    };
  };

  log.info(`Starting DockerCompose environment`);
  try {
    await dockerCompose.upAll(createOptions());
    log.info(`Started DockerCompose environment`);
  } catch ({ err }) {
    log.error(`Failed to start DockerCompose environment: ${err}`);
    try {
      await down(filePath, file, projectName);
    } catch {
      log.warn(`Failed to stop DockerCompose environment after failed start`);
    }
    throw new Error(err.trim());
  }
};

const down = async (filePath: string, file: string, projectName: string): Promise<void> => {
  const createOptions = (): dockerCompose.IDockerComposeOptions => ({
    ...defaultDockerComposeOptions(filePath, file, projectName),
    commandOptions: ["-v"],
  });

  log.info(`Downing DockerCompose environment`);
  try {
    await dockerCompose.down(createOptions());
    log.info(`Downed DockerCompose environment`);
  } catch ({ err }) {
    log.error(`Failed to down DockerCompose environment: ${err}`);
    throw new Error(err.trim());
  }
};

const stop = async (filePath: string, file: string, projectName: string): Promise<void> => {
  log.info(`Stopping DockerCompose environment`);
  try {
    await dockerCompose.stop(defaultDockerComposeOptions(filePath, file, projectName));
    log.info(`Stopped DockerCompose environment`);
  } catch ({ err }) {
    log.error(`Failed to stop DockerCompose environment: ${err}`);
    throw new Error(err.trim());
  }
};
