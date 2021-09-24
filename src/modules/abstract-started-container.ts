import { StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { Port } from "../port";
import { ContainerName, Host, Id, Command, ExecResult } from "../docker/types";
import { Readable } from "stream";

export class AbstractStartedContainer {
  constructor(protected readonly startedTestContainer: StartedTestContainer) {}

  public stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer> {
    return this.startedTestContainer.stop(options);
  }

  public getHost(): Host {
    return this.startedTestContainer.getHost();
  }

  public getMappedPort(port: Port): Port {
    return this.startedTestContainer.getMappedPort(port);
  }

  public getName(): ContainerName {
    return this.startedTestContainer.getName();
  }

  public getId(): Id {
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

  public exec(command: Command[]): Promise<ExecResult> {
    return this.startedTestContainer.exec(command);
  }

  public logs(): Promise<Readable> {
    return this.startedTestContainer.logs();
  }
}
