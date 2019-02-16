import { Duration, TemporalUnit } from "node-duration";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import log from "./logger";
import { Port } from "./port";
import { PortCheck } from "./port-check";
import { IntervalRetryStrategy } from "./retry-strategy";

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
    private readonly internalPortCheck: PortCheck
  ) {
    super();
  }

  public async waitUntilReady(containerState: ContainerState): Promise<void> {
    await Promise.all([this.waitForHostPorts(containerState), this.waitForInternalPorts(containerState)]);
  }

  private async waitForHostPorts(containerState: ContainerState): Promise<void> {
    for (const hostPort of containerState.getHostPorts()) {
      log.debug(`Waiting for host port :${hostPort}`);
      await this.waitForPort(hostPort, this.hostPortCheck);
    }
  }

  private async waitForInternalPorts(containerState: ContainerState): Promise<void> {
    for (const internalPort of containerState.getInternalPorts()) {
      log.debug(`Waiting for internal port :${internalPort}`);
      await this.waitForPort(internalPort, this.internalPortCheck);
    }
  }

  private async waitForPort(port: Port, portCheck: PortCheck): Promise<void> {
    const retryStrategy = new IntervalRetryStrategy(new Duration(100, TemporalUnit.MILLISECONDS));

    await retryStrategy.retryUntil(
      () => portCheck.isBound(port),
      isBound => isBound === true,
      () => {
        const timeout = this.startupTimeout.get(TemporalUnit.MILLISECONDS);
        throw new Error(`Port :${port} not bound after ${timeout}ms`);
      },
      this.startupTimeout
    );
  }
}
