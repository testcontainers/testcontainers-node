import { StoppedTestContainer } from "../test-container";

export class AbstractStoppedContainer implements StoppedTestContainer {
  constructor(protected readonly stoppedTestContainer: StoppedTestContainer) {}

  getArchive(path: string): Promise<NodeJS.ReadableStream> {
    return this.stoppedTestContainer.getArchive(path);
  }
}
