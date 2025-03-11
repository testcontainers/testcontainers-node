import { log } from "../common";
import { ComposeDownOptions, ComposeOptions, getContainerRuntimeClient } from "../container-runtime";
import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { StoppedDockerComposeEnvironment } from "./stopped-docker-compose-environment";

export class StartedDockerComposeEnvironment {
  constructor(
    private readonly startedGenericContainers: { [containerName: string]: StartedGenericContainer },
    private readonly options: ComposeOptions
  ) {}

  public async stop(): Promise<StoppedDockerComposeEnvironment> {
    const client = await getContainerRuntimeClient();
    await client.compose.stop(this.options);
    return new StoppedDockerComposeEnvironment(this.options);
  }

  public async down(options: Partial<ComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const client = await getContainerRuntimeClient();
    const downOptions: ComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await client.compose.down(this.options, downOptions);
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
