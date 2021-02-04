import * as dockerCompose from "docker-compose";
import Dockerode, { ContainerInfo } from "dockerode";
import { BoundPorts } from "./bound-ports";
import { Container } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient, Env, EnvKey, EnvValue } from "./docker-client";
import { DockerClientInstance } from "./docker-client-instance";
import { resolveDockerComposeContainerName } from "./docker-compose-container-name-resolver";
import { StartedGenericContainer } from "./generic-container";
import { containerLog, log } from "./logger";
import { HostPortCheck, InternalPortCheck } from "./port-check";
import { HostPortWaitStrategy, WaitStrategy } from "./wait-strategy";
import { ReaperInstance } from "./reaper";
import { RandomUuid, Uuid } from "./uuid";

export class DockerComposeEnvironment {
  private readonly projectName: string;

  private build = false;
  private env: Env = {};
  private waitStrategy: { [containerName: string]: WaitStrategy } = {};
  private startupTimeout = 60_000;

  constructor(
    private readonly composeFilePath: string,
    private readonly composeFiles: string | string[],
    uuid: Uuid = new RandomUuid()
  ) {
    this.projectName = `testcontainers-${uuid.nextUuid()}`;
  }

  public withBuild(): this {
    this.build = true;
    return this;
  }

  public withEnv(key: EnvKey, value: EnvValue): this {
    this.env[key] = value;
    return this;
  }

  public withWaitStrategy(containerName: string, waitStrategy: WaitStrategy): this {
    this.waitStrategy[containerName] = waitStrategy;
    return this;
  }

  public withStartupTimeout(startupTimeout: number): this {
    this.startupTimeout = startupTimeout;
    return this;
  }

  public async up(): Promise<StartedDockerComposeEnvironment> {
    log.info(`Starting DockerCompose environment ${this.projectName}`);

    const dockerClient = await DockerClientInstance.getInstance();

    (await ReaperInstance.getInstance(dockerClient)).addProject(this.projectName);

    await this.upAll();
    const startedContainers = (await dockerClient.listContainers()).filter(
      (container) => container.Labels["com.docker.compose.project"] === this.projectName
    );

    const startedContainerNames = startedContainers.reduce(
      (containerNames: string[], startedContainer: ContainerInfo) => [
        ...containerNames,
        startedContainer.Names.join(", "),
      ],
      []
    );

    log.info(`Started the following containers: ${startedContainerNames.join(", ")}`);

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

          try {
            log.info(`Waiting for container ${containerName} to be ready`);
            await this.waitForContainer(dockerClient, container, containerName, containerState, boundPorts);
            log.info(`Container ${containerName} is ready`);
          } catch (err) {
            log.error(`Container ${containerName} failed to be ready: ${err}`);

            try {
              await container.stop({ timeout: 0 });
              await container.remove({ removeVolumes: true });
            } catch (stopErr) {
              log.error(`Failed to stop container ${containerName} after it failed to be ready: ${stopErr}`);
            }
            throw err;
          }

          return new StartedGenericContainer(
            container,
            dockerClient.getHost(),
            inspectResult,
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
      this.composeFiles,
      this.projectName,
      startedGenericContainers
    );
  }

  private async upAll() {
    const commandOptions = [];
    if (this.build) {
      commandOptions.push("--build");
    }

    const defaultOptions = defaultDockerComposeOptions(this.composeFilePath, this.composeFiles, this.projectName);
    const options = {
      ...defaultOptions,
      commandOptions,
      env: { ...defaultOptions.env, ...this.env },
    };

    log.info(`Upping DockerCompose environment`);
    try {
      await dockerCompose.upAll(options);
      log.info(`Upped DockerCompose environment`);
    } catch (err) {
      const errorMessage = err.err ? err.err.trim().replace("\r\n", "").replace("\n", ". ") : err;
      log.error(`Failed to up DockerCompose environment: ${errorMessage}`);
      try {
        await down(this.composeFilePath, this.composeFiles, this.projectName);
      } catch {
        log.warn(`Failed to stop DockerCompose environment after failed up`);
      }
      throw new Error(err.err.trim());
    }
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
    const waitStrategy = this.getWaitStrategy(dockerClient, container, containerName);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, containerState, boundPorts);
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
    private readonly composeFiles: string | string[],
    private readonly projectName: string,
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer }
  ) {}

  public async stop(): Promise<StoppedDockerComposeEnvironment> {
    await stop(this.composeFilePath, this.composeFiles, this.projectName);
    return new StoppedDockerComposeEnvironment(this.composeFilePath, this.composeFiles, this.projectName);
  }

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await down(this.composeFilePath, this.composeFiles, this.projectName);
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
    private readonly composeFiles: string | string[],
    private readonly projectName: string
  ) {}

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await down(this.composeFilePath, this.composeFiles, this.projectName);
    return new DownedDockerComposeEnvironment();
  }
}

export class DownedDockerComposeEnvironment {}

const defaultDockerComposeOptions = (
  filePath: string,
  files: string | string[],
  projectName: string
): Partial<dockerCompose.IDockerComposeOptions> => ({
  log: false,
  cwd: filePath,
  config: files,
  env: {
    ...process.env,
    COMPOSE_PROJECT_NAME: projectName,
  },
});

const down = async (filePath: string, files: string | string[], projectName: string): Promise<void> => {
  const createOptions = (): dockerCompose.IDockerComposeOptions => ({
    ...defaultDockerComposeOptions(filePath, files, projectName),
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

const stop = async (filePath: string, files: string | string[], projectName: string): Promise<void> => {
  log.info(`Stopping DockerCompose environment`);
  try {
    await dockerCompose.stop(defaultDockerComposeOptions(filePath, files, projectName));
    log.info(`Stopped DockerCompose environment`);
  } catch ({ err }) {
    log.error(`Failed to stop DockerCompose environment: ${err}`);
    throw new Error(err.trim());
  }
};
