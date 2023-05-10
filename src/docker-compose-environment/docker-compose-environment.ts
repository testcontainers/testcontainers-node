import { ContainerInfo } from "dockerode";
import { BoundPorts } from "../bound-ports";
import { resolveContainerName } from "../docker-compose/functions/container-name-resolver";
import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { containerLog, log } from "../logger";
import { WaitStrategy } from "../wait-strategy/wait-strategy";
import { ReaperInstance } from "../reaper";
import { RandomUuid, Uuid } from "../uuid";
import { Environment } from "../docker/types";
import { listContainers } from "../docker/functions/container/list-containers";
import { getContainerById } from "../docker/functions/container/get-container";
import { getDockerClient } from "../docker/client/docker-client";
import { inspectContainer } from "../docker/functions/container/inspect-container";
import { containerLogs } from "../docker/functions/container/container-logs";
import { StartedDockerComposeEnvironment } from "./started-docker-compose-environment";
import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down";
import { dockerComposeUp } from "../docker-compose/functions/docker-compose-up";
import { waitForContainer } from "../wait-for-container";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { dockerComposePull } from "../docker-compose/functions/docker-compose-pull";
import { Wait } from "../wait-strategy/wait";

export class DockerComposeEnvironment {
  private readonly composeFilePath: string;
  private readonly composeFiles: string | string[];

  private projectName: string;
  private build = false;
  private recreate = true;
  private environmentFile = "";
  private profiles: string[] = [];
  private environment: Environment = {};
  private pullPolicy: PullPolicy = new DefaultPullPolicy();
  private waitStrategy: { [containerName: string]: WaitStrategy } = {};
  private startupTimeout?: number;

  constructor(composeFilePath: string, composeFiles: string | string[], uuid: Uuid = new RandomUuid()) {
    this.composeFilePath = composeFilePath;
    this.composeFiles = composeFiles;
    this.projectName = `testcontainers-${uuid.nextUuid()}`;
  }

  public withBuild(): this {
    this.build = true;
    return this;
  }

  public withEnvironment(environment: Environment): this {
    this.environment = { ...this.environment, ...environment };
    return this;
  }

  public withEnvironmentFile(environmentFile: string): this {
    this.environmentFile = environmentFile;
    return this;
  }

  public withProfiles(...profiles: string[]): this {
    this.profiles = [...this.profiles, ...profiles];
    return this;
  }

  public withNoRecreate(): this {
    this.recreate = false;
    this.projectName = "testcontainers-node";
    return this;
  }

  public withPullPolicy(pullPolicy: PullPolicy): this {
    this.pullPolicy = pullPolicy;
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
    log.info(`Starting DockerCompose environment "${this.projectName}"...`);

    (await ReaperInstance.getInstance()).addProject(this.projectName);

    const options = {
      filePath: this.composeFilePath,
      files: this.composeFiles,
      projectName: this.projectName,
    };

    const commandOptions = [];
    if (this.build) {
      commandOptions.push("--build");
    }
    if (!this.recreate) {
      commandOptions.push("--no-recreate");
    }

    const composeOptions: string[] = [];
    if (this.environmentFile) {
      composeOptions.push("--env-file", this.environmentFile);
    }
    this.profiles.forEach((profile) => composeOptions.push("--profile", profile));

    if (this.pullPolicy.shouldPull()) {
      await dockerComposePull(options, services);
    }
    await dockerComposeUp({ ...options, commandOptions, composeOptions, environment: this.environment }, services);

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

    log.info(`Started containers "${startedContainerNames.join('", "')}"`);

    const startedGenericContainers = (
      await Promise.all(
        startedContainers.map(async (startedContainer) => {
          const container = await getContainerById(startedContainer.Id);
          const containerName = resolveContainerName(this.projectName, startedContainer.Names[0]);

          const { host, hostIps } = await getDockerClient();
          const inspectResult = await inspectContainer(container);
          const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult);
          const waitStrategy = this.waitStrategy[containerName]
            ? this.waitStrategy[containerName]
            : Wait.forListeningPorts();
          if (this.startupTimeout !== undefined) {
            waitStrategy.withStartupTimeout(this.startupTimeout);
          }

          if (containerLog.enabled()) {
            (await containerLogs(container))
              .on("data", (data) => containerLog.trace(`${containerName}: ${data.trim()}`))
              .on("err", (data) => containerLog.error(`${containerName}: ${data.trim()}`));
          }

          try {
            await waitForContainer(container, waitStrategy, boundPorts);
          } catch (err) {
            try {
              await dockerComposeDown(options, { removeVolumes: true, timeout: 0 });
            } catch {
              log.warn(`Failed to stop DockerCompose environment after failed up`);
            }
            throw err;
          }

          return new StartedGenericContainer(container, host, inspectResult, boundPorts, containerName, waitStrategy);
        })
      )
    ).reduce((map, startedGenericContainer) => {
      const containerName = startedGenericContainer.getName();
      return { ...map, [containerName]: startedGenericContainer };
    }, {});

    log.info(`DockerCompose environment started`);

    return new StartedDockerComposeEnvironment(startedGenericContainers, {
      ...options,
      composeOptions,
      environment: this.environment,
    });
  }
}
