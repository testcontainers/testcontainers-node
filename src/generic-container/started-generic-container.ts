import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import Dockerode from "dockerode";
import { Command, ContainerName, ExecResult, Host, Id as ContainerId, Labels } from "../docker/types";
import { inspectContainer, InspectResult } from "../docker/functions/container/inspect-container";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { removeContainer } from "../docker/functions/container/remove-container";
import { Port } from "../port";
import { execContainer } from "../docker/functions/container/exec-container";
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
    private readonly inspectResult: InspectResult,
    private readonly boundPorts: BoundPorts,
    private readonly name: ContainerName,
    private readonly waitStrategy: WaitStrategy
  ) {}

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return this.stopContainer(options);
  }

  public async restart(options: Partial<RestartOptions> = {}): Promise<StartedGenericContainer> {
    const resolvedOptions: RestartOptions = { timeout: 0, ...options };
    await restartContainer(this.container, resolvedOptions);
    const newInspectRes = await inspectContainer(this.container);
    const newBoundPorts = await BoundPorts.fromInspectResult(newInspectRes).filter(
      Array.from(this.boundPorts.iterator()).map((port) => port[0])
    );
    await this.waitForContainer(this.container, newBoundPorts);

    return new StartedGenericContainer(
      this.container,
      this.host,
      newInspectRes,
      newBoundPorts,
      this.name,
      this.waitStrategy
    );
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container with ID: ${this.container.id}`);

    const resolvedOptions: StopOptions = { timeout: 0, removeVolumes: true, ...options };
    await stopContainer(this.container, { timeout: resolvedOptions.timeout });
    await removeContainer(this.container, { removeVolumes: resolvedOptions.removeVolumes });

    return new StoppedGenericContainer();
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

  public exec(command: Command[]): Promise<ExecResult> {
    return execContainer(this.container, command);
  }

  public logs(): Promise<Readable> {
    return containerLogs(this.container);
  }
}
