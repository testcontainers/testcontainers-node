import {
  ExecOptions,
  RestartOptions,
  StartedTestContainer,
  StopOptions,
  StoppedTestContainer,
} from "../test-container";
import Dockerode from "dockerode";
import { ExecResult, Labels } from "../docker/types";
import { inspectContainer, InspectResult } from "../docker/functions/container/inspect-container";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { removeContainer } from "../docker/functions/container/remove-container";
import { execContainer } from "../docker/functions/container/exec-container";
import { Readable } from "stream";
import { containerLogs } from "../docker/functions/container/container-logs";
import { StoppedGenericContainer } from "./stopped-generic-container";
import { stopContainer } from "../docker/functions/container/stop-container";
import { restartContainer } from "../docker/functions/container/restart-container";
import { WaitStrategy } from "../wait-strategy";
import { waitForContainer } from "../wait-for-container";

export class StartedGenericContainer implements StartedTestContainer {
  constructor(
    private readonly container: Dockerode.Container,
    private readonly host: string,
    private inspectResult: InspectResult,
    private boundPorts: BoundPorts,
    private readonly name: string,
    private readonly waitStrategy: WaitStrategy
  ) {}

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return this.stopContainer(options);
  }

  public async restart(options: Partial<RestartOptions> = {}): Promise<void> {
    const resolvedOptions: RestartOptions = { timeout: 0, ...options };
    await restartContainer(this.container, resolvedOptions);

    this.inspectResult = await inspectContainer(this.container);
    this.boundPorts = BoundPorts.fromInspectResult(this.inspectResult).filter(
      Array.from(this.boundPorts.iterator()).map((port) => port[0])
    );
    await waitForContainer(this.container, this.waitStrategy, this.host, this.boundPorts);
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container with ID: ${this.container.id}`);

    const resolvedOptions: StopOptions = { timeout: 0, removeVolumes: true, ...options };
    await stopContainer(this.container, { timeout: resolvedOptions.timeout });
    await removeContainer(this.container, { removeVolumes: resolvedOptions.removeVolumes });

    return new StoppedGenericContainer();
  }

  public getHost(): string {
    return this.host;
  }

  public getMappedPort(port: number): number {
    return this.boundPorts.getBinding(port);
  }

  public getId(): string {
    return this.container.id;
  }

  public getName(): string {
    return this.name;
  }

  public getLabels(): Labels {
    return this.inspectResult.labels;
  }

  public getNetworkNames(): string[] {
    return Object.keys(this.inspectResult.networkSettings);
  }

  public getNetworkId(networkName: string): string {
    return this.inspectResult.networkSettings[networkName].networkId;
  }

  public getIpAddress(networkName: string): string {
    return this.inspectResult.networkSettings[networkName].ipAddress;
  }

  public exec(command: string[], options: Partial<ExecOptions> = {}): Promise<ExecResult> {
    const resolvedOptions: ExecOptions = { stdin: true, detach: false, tty: true, ...options };
    return execContainer(this.container, command, resolvedOptions);
  }

  public logs(): Promise<Readable> {
    return containerLogs(this.container);
  }
}
