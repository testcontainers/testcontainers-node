import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { DockerComposeOptions } from "../docker-compose/docker-compose-options";
import { DockerComposeDownOptions } from "../test-container";

export class StoppedDockerComposeEnvironment {
  constructor(private readonly options: DockerComposeOptions) {}

  public async down(options: Partial<DockerComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const resolvedOptions: DockerComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await dockerComposeDown(this.options, resolvedOptions);
    return new DownedDockerComposeEnvironment();
  }
}
