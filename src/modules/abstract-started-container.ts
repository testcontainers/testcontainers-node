import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { ContentToCopy, ExecResult, FileToCopy, Labels } from "../docker/types";
import { Readable } from "stream";

export class AbstractStartedContainer implements StartedTestContainer {
  constructor(protected readonly startedTestContainer: StartedTestContainer) {}

  protected containerStopping?(): Promise<void>;

  public async stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer> {
    if (this.containerStopping) {
      await this.containerStopping();
    }

    const stoppedContainer = this.startedTestContainer.stop(options);

    if (this.containerStopped) {
      await this.containerStopped();
    }

    return stoppedContainer;
  }

  protected containerStopped?(): Promise<void>;

  public async restart(options?: Partial<RestartOptions>): Promise<void> {
    return this.startedTestContainer.restart(options);
  }

  public getHost(): string {
    return this.startedTestContainer.getHost();
  }

  public getFirstMappedPort(): number {
    return this.startedTestContainer.getFirstMappedPort();
  }

  public getMappedPort(port: number): number {
    return this.startedTestContainer.getMappedPort(port);
  }

  public getName(): string {
    return this.startedTestContainer.getName();
  }

  public getLabels(): Labels {
    return this.startedTestContainer.getLabels();
  }

  public getId(): string {
    return this.startedTestContainer.getId();
  }

  public getNetworkNames(): string[] {
    return this.startedTestContainer.getNetworkNames();
  }

  public getNetworkId(networkName: string): string {
    return this.startedTestContainer.getNetworkId(networkName);
  }

  public getIpAddress(networkName: string): string {
    return this.startedTestContainer.getIpAddress(networkName);
  }

  public async copyFilesToContainer(filesToCopy: FileToCopy[]): Promise<void> {
    return this.startedTestContainer.copyFilesToContainer(filesToCopy);
  }

  public async copyContentToContainer(contentsToCopy: ContentToCopy[]): Promise<void> {
    return this.startedTestContainer.copyContentToContainer(contentsToCopy);
  }

  public copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream> {
    return this.startedTestContainer.copyArchiveFromContainer(path);
  }

  public exec(command: string | string[]): Promise<ExecResult> {
    return this.startedTestContainer.exec(command);
  }

  public logs(): Promise<Readable> {
    return this.startedTestContainer.logs();
  }
}
