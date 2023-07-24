import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { ComposeDownOptions, ComposeOptions, getContainerRuntimeClient } from "@testcontainers/container-runtime";

export class StoppedDockerComposeEnvironment {
  constructor(private readonly options: ComposeOptions) {}

  public async down(options: Partial<ComposeDownOptions> = {}): Promise<DownedDockerComposeEnvironment> {
    const client = await getContainerRuntimeClient();
    const resolvedOptions: ComposeDownOptions = { timeout: 0, removeVolumes: true, ...options };
    await client.compose.down(this.options, resolvedOptions);
    return new DownedDockerComposeEnvironment();
  }
}
