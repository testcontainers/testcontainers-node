import { dockerComposeDown } from "./docker-compose-down";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";

export class StoppedDockerComposeEnvironment {
  constructor(
    private readonly composeFilePath: string,
    private readonly composeFiles: string | string[],
    private readonly projectName: string
  ) {}

  public async down(): Promise<DownedDockerComposeEnvironment> {
    await dockerComposeDown(this.composeFilePath, this.composeFiles, this.projectName);
    return new DownedDockerComposeEnvironment();
  }
}
