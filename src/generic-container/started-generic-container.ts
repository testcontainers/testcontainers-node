import {
  RestartOptions,
  StartedTestContainer,
  StopOptions,
  ExecOptions,
  StoppedTestContainer,
} from "../test-container";
import Dockerode from "dockerode";
import { Command, ContainerName, ExecResult, Host, Id as ContainerId, Labels } from "../docker/types";
import { inspectContainer, InspectResult } from "../docker/functions/container/inspect-container";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { removeContainer } from "../docker/functions/container/remove-container";
import { Port } from "../port";
import { execContainer, ExecContainerOptions } from "../docker/functions/container/exec-container";
import { Readable } from "stream";
import { containerLogs } from "../docker/functions/container/container-logs";
import { StoppedGenericContainer } from "./stopped-generic-container";
import { stopContainer } from "../docker/functions/container/stop-container";
import { restartContainer } from "../docker/functions/container/restart-container";
import { WaitStrategy } from "../wait-strategy";

export class StartedGenericContainer implements StartedTestContainer {
  constructor(
    private readonly container: Dockerode.Container,
    private readonly host: Host,
    private inspectResult: InspectResult,
    private boundPorts: BoundPorts,
    private readonly name: ContainerName,
    private readonly waitStrategy: WaitStrategy
  ) {}

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return this.stopContainer(options);
  }

  public async restart(options: Partial<RestartOptions> = {}): Promise<void> {
    const resolvedOptions: RestartOptions = { timeout: 0, ...options };
    await restartContainer(this.container, resolvedOptions);

    // Inspect the restarted container and update the bound ports
    this.inspectResult = await inspectContainer(this.container);
    this.boundPorts = await BoundPorts.fromInspectResult(this.inspectResult).filter(
      Array.from(this.boundPorts.iterator()).map((port) => port[0])
    );
    await this.waitForContainer(this.container, this.boundPorts);
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container with ID: ${this.container.id}`);

    const resolvedOptions: StopOptions = { timeout: 0, removeVolumes: true, ...options };
    await stopContainer(this.container, { timeout: resolvedOptions.timeout });
    await removeContainer(this.container, { removeVolumes: resolvedOptions.removeVolumes });

    return new StoppedGenericContainer();
  }

  private async execContainer(command: Command[], options: Partial<ExecOptions> = {}): Promise<ExecResult> {
    const resolvedOptions: ExecOptions = { stdin: true, Detach: false, Tty: true, ...options };
    return execContainer(this.container, command, resolvedOptions);
  }

  private async waitForContainer(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    log.debug(`Waiting for container to be ready: ${container.id}`);

    try {
      await this.waitStrategy.waitUntilReady(container, boundPorts);
      log.info("Container is ready");
    } catch (err) {
      log.error(`Container failed to be ready: ${err}`);
      try {
        await stopContainer(container, { timeout: 0 });
        await removeContainer(container, { removeVolumes: true });
      } catch (stopErr) {
        log.error(`Failed to stop container after it failed to be ready: ${stopErr}`);
      }
      throw err;
    }
  }

  public getHost(): Host {
    return this.host;
  }

  public getMappedPort(port: Port): Port {
    return this.boundPorts.getBinding(port);
  }

  public getId(): ContainerId {
    return this.container.id;
  }

  public getName(): ContainerName {
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

  public exec(command: Command[], options?: ExecContainerOptions): Promise<ExecResult> {
    return this.execContainer(command, options);
  }

  public logs(): Promise<Readable> {
    return containerLogs(this.container);
  }
}
