import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { log } from "../logger";
import { StoppedDockerComposeEnvironment } from "./stopped-docker-compose-environment";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { DockerComposeDownOptions, DockerComposeOptions } from "../docker-compose/docker-compose-options";
import { getDockerClient } from "../docker/client/docker-client";

export class StartedDockerComposeEnvironment {
  constructor(
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer },
    private readonly options: DockerComposeOptions
  ) {}

  public async stop(): Promise<StoppedDockerComposeEnvironment> {
    const { dockerComposeClient } = await getDockerClient();
    await dockerComposeClient.stop(this.options);
    return new StoppedDockerComposeEnvironment(this.options);
  }

  public async down(options: Partial<DockerComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const { dockerComposeClient } = await getDockerClient();
    const downOptions: DockerComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await dockerComposeClient.down(this.options, downOptions);
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
