import { StoppedTestContainer } from "../test-container";
import { getContainerArchive } from "../docker/functions/container/get-container-archive";
import Dockerode from "dockerode";
import { log } from "../logger";

export class StoppedGenericContainer implements StoppedTestContainer {
  constructor(private readonly container: Dockerode.Container) {}

  getId(): string {
    return this.container.id;
  }

  getArchive(path: string): Promise<NodeJS.ReadableStream> {
    log.debug(`Getting archive "${path}"...`, { containerId: this.container.id });
    const stream = getContainerArchive({ container: this.container, path: path });
    log.debug(`Got archive "${path}"`, { containerId: this.container.id });
    return stream;
  }
}
