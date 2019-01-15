import { Container } from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import { Clock, SystemClock, Time } from "./clock";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import log from "./logger";
import { PortCheckClient, SystemPortCheckClient } from "./port-check-client";

export interface WaitStrategy {
  waitUntilReady(container: Container, containerState: ContainerState): Promise<void>;
  withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}

abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = new Duration(10_000, TemporalUnit.MILLISECONDS);

  public abstract waitUntilReady(container: Container, containerState: ContainerState): Promise<void>;

  public withStartupTimeout(startupTimeout: Duration): WaitStrategy {
    this.startupTimeout = startupTimeout;
    return this;
  }
}

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  constructor(
    private readonly dockerClient: DockerClient,
    private readonly portCheckClient: PortCheckClient = new SystemPortCheckClient(),
    private readonly clock: Clock = new SystemClock()
  ) {
    super();
  }

  public async waitUntilReady(container: Container, containerState: ContainerState): Promise<void> {
    await Promise.all([this.hostPortCheck(containerState), this.internalPortCheck(container, containerState)]);
  }

  private async hostPortCheck(containerState: ContainerState): Promise<void> {
    const startTime = this.clock.getTime();
    const hostPorts = containerState.getHostPorts();

    let hostPortIndex = 0;

    while (hostPortIndex < hostPorts.length) {
      const hostPort = hostPorts[hostPortIndex];
      log.info(`Waiting for host port :${hostPort}`);

      if (this.hasStartupTimeoutElapsed(startTime)) {
        const timeout = this.startupTimeout.get(TemporalUnit.MILLISECONDS);
        throw new Error(`Port :${hostPort} not bound after ${timeout}ms`);
      }

      if (!(await this.portCheckClient.isFree(hostPort))) {
        hostPortIndex++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async internalPortCheck(container: Container, containerState: ContainerState): Promise<void> {
    const startTime = this.clock.getTime();
    const internalPorts = containerState.getInternalPorts();

    let internalPortIndex = 0;

    while (internalPortIndex < internalPorts.length) {
      const internalPort = internalPorts[internalPortIndex];
      log.info(`Waiting for internal port :${internalPort}`);

      if (this.hasStartupTimeoutElapsed(startTime)) {
        const timeout = this.startupTimeout.get(TemporalUnit.MILLISECONDS);
        throw new Error(`Port :${internalPort} not bound after ${timeout}ms`);
      }

      const commands = [
        ["/bin/sh", "-c", `cat /proc/net/tcp | awk '{print $2}' | grep -i :${internalPort.toString(16)}`],
        ["/bin/sh", "-c", `cat /proc/net/tcp6 | awk '{print $2}' | grep -i :${internalPort.toString(16)}`],
        ["/bin/sh", "-c", `nc -vz -w 1 localhost ${internalPort}`],
        ["/bin/sh", "-c", `</dev/tcp/localhost/${internalPort}`]
      ];
      const results = await Promise.all(commands.map(command => this.dockerClient.exec(container, command)));

      if (results.some(result => result.exitCode === 0)) {
        internalPortIndex++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private hasStartupTimeoutElapsed(startTime: Time): boolean {
    return this.clock.getTime() - startTime > this.startupTimeout.get(TemporalUnit.MILLISECONDS);
  }
}
