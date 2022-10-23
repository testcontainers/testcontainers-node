import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down.js";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment.js";
import { DockerComposeOptions } from "../docker-compose/docker-compose-options.js";
import { DockerComposeDownOptions } from "../test-container.js";

export class StoppedDockerComposeEnvironment {
  constructor(private readonly options: DockerComposeOptions) {}

  public async down(options: Partial<DockerComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const resolvedOptions: DockerComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await dockerComposeDown(this.options, resolvedOptions);
    return new DownedDockerComposeEnvironment();
  }
}
