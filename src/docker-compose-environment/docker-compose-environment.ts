import Dockerode, { ContainerInfo } from "dockerode";
import { BoundPorts } from "../bound-ports";
import { resolveContainerName } from "../docker-compose/functions/container-name-resolver";
import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { containerLog, log } from "../logger";
import { HostPortCheck, InternalPortCheck } from "../port-check";
import { HostPortWaitStrategy, WaitStrategy } from "../wait-strategy";
import { ReaperInstance } from "../reaper";
import { RandomUuid, Uuid } from "../uuid";
import { Env, EnvKey, EnvValue, Host } from "../docker/types";
import { listContainers } from "../docker/functions/container/list-containers";
import { getContainerById } from "../docker/functions/container/get-container";
import { dockerHost } from "../docker/docker-host";
import { inspectContainer } from "../docker/functions/container/inspect-container";
import { containerLogs } from "../docker/functions/container/container-logs";
import { StartedDockerComposeEnvironment } from "./started-docker-compose-environment";
import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down";
import { DockerComposeOptions } from "../docker-compose/docker-compose-options";
import { dockerComposeUp } from "../docker-compose/functions/docker-compose-up";

export class DockerComposeEnvironment {
  private readonly projectName: string;
  private readonly options: DockerComposeOptions;

  private build = false;
  private env: Env = {};
  private waitStrategy: { [containerName: string]: WaitStrategy } = {};
  private startupTimeout = 60_000;

  constructor(composeFilePath: string, composeFiles: string | string[], uuid: Uuid = new RandomUuid()) {
    this.projectName = `testcontainers-${uuid.nextUuid()}`;
    this.options = { filePath: composeFilePath, files: composeFiles, projectName: this.projectName };
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

  public async up(services?: Array<string>): Promise<StartedDockerComposeEnvironment> {
    log.info(`Starting DockerCompose environment ${this.projectName}`);

    (await ReaperInstance.getInstance()).addProject(this.projectName);

    const commandOptions = [];
    if (this.build) {
      commandOptions.push("--build");
    }
    await dockerComposeUp({ ...this.options, commandOptions, env: this.env }, services);

    const startedContainers = (await listContainers()).filter(
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
          const container = getContainerById(startedContainer.Id);
          const containerName = resolveContainerName(this.projectName, startedContainer.Names[0]);

          (await containerLogs(container))
            .on("data", (data) => containerLog.trace(`${containerName}: ${data}`))
            .on("err", (data) => containerLog.error(`${containerName}: ${data}`));

          const inspectResult = await inspectContainer(container);
          const boundPorts = this.getBoundPorts(startedContainer);

          try {
            log.info(`Waiting for container ${containerName} to be ready`);
            await this.waitForContainer(container, containerName, boundPorts);
            log.info(`Container ${containerName} is ready`);
          } catch (err) {
            log.error(`Container ${containerName} failed to be ready: ${err}`);
            try {
              await dockerComposeDown(this.options);
            } catch {
              log.warn(`Failed to stop DockerCompose environment after failed up`);
            }
            throw err;
          }

          return new StartedGenericContainer(container, await dockerHost, inspectResult, boundPorts, containerName);
        })
      )
    ).reduce((map, startedGenericContainer) => {
      const containerName = startedGenericContainer.getName();
      return { ...map, [containerName]: startedGenericContainer };
    }, {});

    log.info(`DockerCompose environment started: ${Object.keys(startedGenericContainers).join(", ")}`);

    return new StartedDockerComposeEnvironment(startedGenericContainers, this.options);
  }

  private getBoundPorts(containerInfo: Dockerode.ContainerInfo): BoundPorts {
    const boundPorts = new BoundPorts();
    containerInfo.Ports.filter((port) => port.PublicPort !== undefined).forEach((port) =>
      boundPorts.setBinding(port.PrivatePort, port.PublicPort)
    );
    return boundPorts;
  }

  private async waitForContainer(
    container: Dockerode.Container,
    containerName: string,
    boundPorts: BoundPorts
  ): Promise<void> {
    const waitStrategy = this.getWaitStrategy(await dockerHost, container, containerName);
    await waitStrategy.withStartupTimeout(this.startupTimeout).waitUntilReady(container, boundPorts);
  }

  private getWaitStrategy(host: Host, container: Dockerode.Container, containerName: string): WaitStrategy {
    if (this.waitStrategy[containerName]) {
      return this.waitStrategy[containerName];
    } else {
      const hostPortCheck = new HostPortCheck(host);
      const internalPortCheck = new InternalPortCheck(container);
      return new HostPortWaitStrategy(hostPortCheck, internalPortCheck);
    }
  }
}
