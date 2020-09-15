import { Duration, TemporalUnit } from "node-duration";
import { BoundPorts } from "./bound-ports";
import { Container, HealthCheckStatus } from "./container";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import { log } from "./logger";
import { Port } from "./port";
import { PortCheck } from "./port-check";
import { IntervalRetryStrategy } from "./retry-strategy";

export interface WaitStrategy {
  waitUntilReady(container: Container, containerState: ContainerState, boundPorts: BoundPorts): Promise<void>;
  withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}

abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = new Duration(30_000, TemporalUnit.MILLISECONDS);

  public abstract waitUntilReady(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void>;

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

  public async waitUntilReady(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void> {
    await Promise.all([this.waitForHostPorts(containerState), this.waitForInternalPorts(boundPorts)]);
  }

  private async waitForHostPorts(containerState: ContainerState): Promise<void> {
    for (const hostPort of containerState.getHostPorts()) {
      log.debug(`Waiting for host port ${hostPort}`);
      await this.waitForPort(hostPort, this.hostPortCheck);
    }
  }

  private async waitForInternalPorts(boundPorts: BoundPorts): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      log.debug(`Waiting for internal port ${internalPort}`);
      await this.waitForPort(internalPort, this.internalPortCheck);
    }
  }

  private async waitForPort(port: Port, portCheck: PortCheck): Promise<void> {
    const retryStrategy = new IntervalRetryStrategy<boolean, Error>(new Duration(100, TemporalUnit.MILLISECONDS));

    await retryStrategy.retryUntil(
      () => portCheck.isBound(port),
      (isBound) => isBound,
      () => {
        const timeout = this.startupTimeout.get(TemporalUnit.MILLISECONDS);
        throw new Error(`Port ${port} not bound after ${timeout}ms`);
      },
      this.startupTimeout
    );
  }
}

export type Log = string;

export class LogWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly message: Log) {
    super();
  }

  public async waitUntilReady(container: Container): Promise<void> {
    return new Promise(async (resolve, reject) => {
      log.debug(`Waiting for log message "${this.message}"`);

      const stream = await container.logs();
      stream
        .on("data", (line) => {
          if (line.includes(this.message)) {
            resolve();
          }
        })
        .on("err", (line) => {
          if (line.includes(this.message)) {
            resolve();
          }
        })
        .on("end", () => {
          reject();
        });
    });
  }
}

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Container): Promise<void> {
    log.debug(`Waiting for health check`);

    const retryStrategy = new IntervalRetryStrategy<HealthCheckStatus, Error>(
      new Duration(100, TemporalUnit.MILLISECONDS)
    );

    await retryStrategy.retryUntil(
      async () => (await container.inspect()).healthCheckStatus,
      (status) => status === "healthy",
      () => {
        const timeout = this.startupTimeout.get(TemporalUnit.MILLISECONDS);
        throw new Error(`Health check not healthy after ${timeout}ms`);
      },
      this.startupTimeout
    );
  }
}
