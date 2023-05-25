import { StoppedTestContainer } from "../test-container";
import { getContainerArchive } from "../docker/functions/container/get-container-archive";
import Dockerode from "dockerode";

export class StoppedGenericContainer implements StoppedTestContainer {
  constructor(private readonly container: Dockerode.Container) {}

  getId(): string {
    return this.container.id;
  }

  getArchive(path: string): Promise<NodeJS.ReadableStream> {
    return getContainerArchive({ container: this.container, path: path });
  }
}
