import { StartedGenericContainer } from "../generic-container/started-generic-container.js";
import { log } from "../logger.js";
import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down.js";
import { dockerComposeStop } from "../docker-compose/functions/docker-compose-stop.js";
import { StoppedDockerComposeEnvironment } from "./stopped-docker-compose-environment.js";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment.js";
import { DockerComposeOptions } from "../docker-compose/docker-compose-options.js";
import { DockerComposeDownOptions } from "../test-container.js";

export class StartedDockerComposeEnvironment {
  constructor(
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer },
    private readonly options: DockerComposeOptions
  ) {}

  public async stop(): Promise<StoppedDockerComposeEnvironment> {
    await dockerComposeStop(this.options);
    return new StoppedDockerComposeEnvironment(this.options);
  }

  public async down(options: Partial<DockerComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const downOptions: DockerComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await dockerComposeDown(this.options, downOptions);
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
