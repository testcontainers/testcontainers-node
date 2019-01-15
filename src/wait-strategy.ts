import { Duration, TemporalUnit } from "node-duration";
import { Clock, SystemClock, Time } from "./clock";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import log from "./logger";
import { PortCheck } from "./port-check";

export interface WaitStrategy {
  waitUntilReady(containerState: ContainerState): Promise<void>;
  withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}

abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = new Duration(10_000, TemporalUnit.MILLISECONDS);

  public abstract waitUntilReady(containerState: ContainerState): Promise<void>;

  public withStartupTimeout(startupTimeout: Duration): WaitStrategy {
    this.startupTimeout = startupTimeout;
    return this;
  }
}

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  constructor(
    private readonly dockerClient: DockerClient,
    private readonly hostPortCheck: PortCheck,
    private readonly internalPortCheck: PortCheck,
    private readonly clock: Clock = new SystemClock()
  ) {
    super();
  }

  public async waitUntilReady(containerState: ContainerState): Promise<void> {
    await Promise.all([this.doHostPortCheck(containerState), this.doInternalPortCheck(containerState)]);
  }

  private async doHostPortCheck(containerState: ContainerState): Promise<void> {
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

      if (this.hostPortCheck.isBound(hostPort)) {
        hostPortIndex++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async doInternalPortCheck(containerState: ContainerState): Promise<void> {
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

      if (this.internalPortCheck.isBound(internalPort)) {
        internalPortIndex++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private hasStartupTimeoutElapsed(startTime: Time): boolean {
    return this.clock.getTime() - startTime > this.startupTimeout.get(TemporalUnit.MILLISECONDS);
  }
}
