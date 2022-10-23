import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { log } from "../logger";
import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down";
import { dockerComposeStop } from "../docker-compose/functions/docker-compose-stop";
import { StoppedDockerComposeEnvironment } from "./stopped-docker-compose-environment";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { DockerComposeOptions } from "../docker-compose/docker-compose-options";
import { DockerComposeDownOptions } from "../test-container";

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
