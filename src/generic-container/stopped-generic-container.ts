import { StoppedTestContainer } from "../test-container";
import Dockerode from "dockerode";
import { log } from "@testcontainers/logger";
import { getContainerRuntimeClient } from "@testcontainers/container-runtime";

export class StoppedGenericContainer implements StoppedTestContainer {
  constructor(private readonly container: Dockerode.Container) {}

  getId(): string {
    return this.container.id;
  }

  async copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream> {
    log.debug(`Copying archive "${path}" from container...`, { containerId: this.container.id });
    const client = await getContainerRuntimeClient();
    const stream = await client.container.fetchArchive(this.container, path);
    log.debug(`Copied archive "${path}" from container`, { containerId: this.container.id });
    return stream;
  }
}
