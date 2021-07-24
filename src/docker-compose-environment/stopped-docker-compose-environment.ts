import { dockerComposeDown } from "../docker-compose/functions/docker-compose-down";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { DockerComposeOptions } from "../docker-compose/docker-compose-options";

export class StoppedDockerComposeEnvironment {
  constructor(private readonly options: DockerComposeOptions) {}

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await dockerComposeDown(this.options);
    return new DownedDockerComposeEnvironment();
  }
}
