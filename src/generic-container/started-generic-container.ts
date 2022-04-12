import { StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import Dockerode from "dockerode";
import { Command, ContainerName, ExecResult, Host, Id as ContainerId, Labels } from "../docker/types";
import { InspectResult } from "../docker/functions/container/inspect-container";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { removeContainer } from "../docker/functions/container/remove-container";
import { Port } from "../port";
import { execContainer } from "../docker/functions/container/exec-container";
import { Readable } from "stream";
import { containerLogs } from "../docker/functions/container/container-logs";
import { StoppedGenericContainer } from "./stopped-generic-container";
import { stopContainer } from "../docker/functions/container/stop-container";

export class StartedGenericContainer implements StartedTestContainer {
  constructor(
    private readonly container: Dockerode.Container,
    private readonly host: Host,
    private readonly inspectResult: InspectResult,
    private readonly boundPorts: BoundPorts,
    private readonly name: ContainerName
  ) {}

  public async stop(options: Partial<StopOptions> = {}): Promise<StoppedTestContainer> {
    return this.stopContainer(options);
  }

  private async stopContainer(options: Partial<StopOptions> = {}): Promise<StoppedGenericContainer> {
    log.info(`Stopping container with ID: ${this.container.id}`);

    const resolvedOptions: StopOptions = { timeout: 0, removeVolumes: true, ...options };
    await stopContainer(this.container, { timeout: resolvedOptions.timeout });
    await removeContainer(this.container, { removeVolumes: resolvedOptions.removeVolumes });

    return new StoppedGenericContainer();
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
