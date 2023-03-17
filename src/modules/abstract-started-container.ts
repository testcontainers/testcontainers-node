import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { ExecResult, Labels } from "../docker/types";
import { Readable } from "stream";

export class AbstractStartedContainer implements StartedTestContainer {
  constructor(protected readonly startedTestContainer: StartedTestContainer) {}

  public stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer> {
    return this.startedTestContainer.stop(options);
  }

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

  public exec(command: string[]): Promise<ExecResult> {
    return this.startedTestContainer.exec(command);
  }

  public logs(): Promise<Readable> {
    return this.startedTestContainer.logs();
  }
}
