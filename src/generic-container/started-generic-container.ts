import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import Dockerode from "dockerode";
import { ExecResult, Labels } from "../docker/types";
import { inspectContainer, InspectResult } from "../docker/functions/container/inspect-container";
import { BoundPorts } from "../bound-ports";
import { containerLog, log } from "../logger";
import { removeContainer } from "../docker/functions/container/remove-container";
import { execContainer } from "../docker/functions/container/exec-container";
import { Readable } from "stream";
import { containerLogs } from "../docker/functions/container/container-logs";
import { StoppedGenericContainer } from "./stopped-generic-container";
import { stopContainer } from "../docker/functions/container/stop-container";
import { restartContainer } from "../docker/functions/container/restart-container";
import { WaitStrategy } from "../wait-strategy/wait-strategy";
import { waitForContainer } from "../wait-for-container";
import { getDockerClient } from "../docker/client/docker-client";
import AsyncLock from "async-lock";

export class StartedGenericContainer implements StartedTestContainer {
  private stoppedContainer?: StoppedTestContainer;
  private stopContainerLock = new AsyncLock();

  constructor(
    private readonly container: Dockerode.Container,
    private readonly host: string,
    private inspectResult: InspectResult,
    private boundPorts: BoundPorts,
    private readonly name: string,
    private readonly waitStrategy: WaitStrategy
  ) {}

  protected containerIsStopping?(): Promise<void>;

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return this.stopContainerLock.acquire("stop", async () => {
      if (this.stoppedContainer) {
        return this.stoppedContainer;
      }
      this.stoppedContainer = await this.stopContainer(options);
      return this.stoppedContainer;
    });
  }

  protected containerIsStopped?(): Promise<void>;

  public async restart(options: Partial<RestartOptions> = {}): Promise<void> {
    const resolvedOptions: RestartOptions = { timeout: 0, ...options };
    log.info(`Restarting container...`, { containerId: this.container.id });
    await restartContainer(this.container, resolvedOptions);

    const { hostIps } = await getDockerClient();
    this.inspectResult = await inspectContainer(this.container);
    const startTime = this.inspectResult.state.startedAt;

    if (containerLog.enabled()) {
      (await containerLogs(this.container, { since: startTime }))
        .on("data", (data) => containerLog.trace(data.trim(), { containerId: this.container.id }))
        .on("err", (data) => containerLog.error(data.trim(), { containerId: this.container.id }));
    }

    this.boundPorts = BoundPorts.fromInspectResult(hostIps, this.inspectResult).filter(
      Array.from(this.boundPorts.iterator()).map((port) => port[0])
    );

    await waitForContainer(this.container, this.waitStrategy, this.boundPorts, startTime);
    log.info(`Restarted container`, { containerId: this.container.id });
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container...`, { containerId: this.container.id });

    if (this.containerIsStopping) {
      await this.containerIsStopping();
    }

    const resolvedOptions: StopOptions = { timeout: 0, removeVolumes: true, ...options };
    await stopContainer(this.container, { timeout: resolvedOptions.timeout });
    await removeContainer(this.container, { removeVolumes: resolvedOptions.removeVolumes });
    log.info(`Stopped container`, { containerId: this.container.id });

    if (this.containerIsStopped) {
      await this.containerIsStopped();
    }

    return new StoppedGenericContainer();
  }

  public getHost(): string {
    return this.host;
  }

  public getFirstMappedPort(): number {
    return this.boundPorts.getFirstBinding();
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

  public async exec(command: string[]): Promise<ExecResult> {
    const { dockerode, containerRuntime } = await getDockerClient();
    log.debug(`Executing command "${command.join(" ")}"...`, { containerId: this.container.id });
    const output = await execContainer(dockerode, containerRuntime, this.container, command);
    log.debug(`Executed command "${command.join(" ")}"...`, { containerId: this.container.id });
    return output;
  }

  public logs(): Promise<Readable> {
    return containerLogs(this.container);
  }
}
