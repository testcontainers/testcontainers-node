import { Readable } from "stream";
import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { CommitOptions, ContentToCopy, DirectoryToCopy, ExecOptions, ExecResult, FileToCopy, Labels } from "../types";

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

  public async commit(options: CommitOptions): Promise<string> {
    return this.startedTestContainer.commit(options);
  }

  public getHost(): string {
    return this.startedTestContainer.getHost();
  }

  public getHostname(): string {
    return this.startedTestContainer.getHostname();
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

  public async copyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): Promise<void> {
    return this.startedTestContainer.copyDirectoriesToContainer(directoriesToCopy);
  }

  public async copyContentToContainer(contentsToCopy: ContentToCopy[]): Promise<void> {
    return this.startedTestContainer.copyContentToContainer(contentsToCopy);
  }

  public copyArchiveToContainer(tar: Readable, target = "/"): Promise<void> {
    return this.startedTestContainer.copyArchiveToContainer(tar, target);
  }

  public copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream> {
    return this.startedTestContainer.copyArchiveFromContainer(path);
  }

  public exec(command: string | string[], opts?: Partial<ExecOptions>): Promise<ExecResult> {
    return this.startedTestContainer.exec(command, opts);
  }

  public logs(opts?: { since?: number; tail?: number }): Promise<Readable> {
    return this.startedTestContainer.logs(opts);
  }
}
