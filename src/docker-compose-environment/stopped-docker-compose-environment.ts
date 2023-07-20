import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { DockerComposeDownOptions, DockerComposeOptions } from "../docker-compose/docker-compose-options";
import { getDockerClient } from "../docker/client/docker-client";

export class StoppedDockerComposeEnvironment {
  constructor(private readonly options: DockerComposeOptions) {}

  public async down(options: Partial<DockerComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const { dockerComposeClient } = await getDockerClient();
    const resolvedOptions: DockerComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await dockerComposeClient.down(this.options, resolvedOptions);
    return new DownedDockerComposeEnvironment();
  }
}
