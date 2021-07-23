import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { log } from "../logger";
import { dockerComposeDown } from "./docker-compose-down";
import { dockerComposeStop } from "./docker-compose-stop";
import { StoppedDockerComposeEnvironment } from "./stopped-docker-compose-environment";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";

export class StartedDockerComposeEnvironment {
  constructor(
    private readonly composeFilePath: string,
    private readonly composeFiles: string | string[],
    private readonly projectName: string,
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer }
  ) {}

  public async stop(): Promise<StoppedDockerComposeEnvironment> {
    await dockerComposeStop(this.composeFilePath, this.composeFiles, this.projectName);
    return new StoppedDockerComposeEnvironment(this.composeFilePath, this.composeFiles, this.projectName);
  }

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await dockerComposeDown(this.composeFilePath, this.composeFiles, this.projectName);
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
