import { ContainerInfo } from "dockerode";
import { containerLog, log, RandomUuid, Uuid } from "../common";
import { getContainerRuntimeClient, parseComposeContainerName } from "../container-runtime";
import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { getReaper } from "../reaper/reaper";
import { Environment } from "../types";
import { BoundPorts } from "../utils/bound-ports";
import { mapInspectResult } from "../utils/map-inspect-result";
import { ImagePullPolicy, PullPolicy } from "../utils/pull-policy";
import { Wait } from "../wait-strategies/wait";
import { waitForContainer } from "../wait-strategies/wait-for-container";
import { WaitStrategy } from "../wait-strategies/wait-strategy";
import { StartedDockerComposeEnvironment } from "./started-docker-compose-environment";

export class DockerComposeEnvironment {
  private readonly composeFilePath: string;
  private readonly composeFiles: string | string[];

  private projectName: string;
  private build = false;
  private recreate = true;
  private environmentFile = "";
  private profiles: string[] = [];
  private environment: Environment = {};
  private pullPolicy: ImagePullPolicy = PullPolicy.defaultPolicy();
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

  public withPullPolicy(pullPolicy: ImagePullPolicy): this {
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

  public withProjectName(projectName: string): this {
    this.projectName = projectName;
    return this;
  }

  public async up(services?: Array<string>): Promise<StartedDockerComposeEnvironment> {
    log.info(`Starting DockerCompose environment "${this.projectName}"...`);
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);
    reaper.addComposeProject(this.projectName);

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
      await client.compose.pull(options, services);
    }
    await client.compose.up(
      {
        ...options,
        commandOptions,
        composeOptions,
        environment: { ...this.environment },
      },
      services
    );

    const startedContainers = (await client.container.list()).filter(
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
          const container = client.container.getById(startedContainer.Id);
          const containerName = parseComposeContainerName(this.projectName, startedContainer.Names[0]);

          const inspectResult = await client.container.inspect(container);
          const mappedInspectResult = mapInspectResult(inspectResult);
          const boundPorts = BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult);
          const waitStrategy = this.waitStrategy[containerName]
            ? this.waitStrategy[containerName]
            : Wait.forListeningPorts();
          if (this.startupTimeout !== undefined) {
            waitStrategy.withStartupTimeout(this.startupTimeout);
          }

          if (containerLog.enabled()) {
            (await client.container.logs(container))
              .on("data", (data) => containerLog.trace(`${containerName}: ${data.trim()}`))
              .on("err", (data) => containerLog.error(`${containerName}: ${data.trim()}`));
          }

          try {
            await waitForContainer(client, container, waitStrategy, boundPorts);
          } catch (err) {
            try {
              await client.compose.down(options, { removeVolumes: true, timeout: 0 });
            } catch {
              log.warn(`Failed to stop DockerCompose environment after failed up`);
            }
            throw err;
          }

          return new StartedGenericContainer(
            container,
            client.info.containerRuntime.host,
            inspectResult,
            boundPorts,
            containerName,
            waitStrategy
          );
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
