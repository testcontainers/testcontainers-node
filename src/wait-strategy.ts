import byline from "byline";
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
  withStartupTimeout(startupTimeout: number): WaitStrategy;
}

abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = 60_000;

  public abstract waitUntilReady(
    container: Container,
    containerState: ContainerState,
    boundPorts: BoundPorts
  ): Promise<void>;

  public withStartupTimeout(startupTimeout: number): WaitStrategy {
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
      log.debug(`Host port ${hostPort} ready`);
    }
  }

  private async waitForInternalPorts(boundPorts: BoundPorts): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      log.debug(`Waiting for internal port ${internalPort}`);
      await this.waitForPort(internalPort, this.internalPortCheck);
      log.debug(`Internal port ${internalPort} ready`);
    }
  }

  private async waitForPort(port: Port, portCheck: PortCheck): Promise<void> {
    const retryStrategy = new IntervalRetryStrategy<boolean, Error>(100);

    await retryStrategy.retryUntil(
      () => portCheck.isBound(port),
      (isBound) => isBound,
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Port ${port} not bound after ${timeout}ms`);
      },
      this.startupTimeout
    );
  }
}

export type Log = string;

export class LogWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly message: Log | RegExp) {
    super();
  }

  public async waitUntilReady(container: Container): Promise<void> {
    log.debug(`Waiting for log message "${this.message}"`);
    const stream = await container.logs();

    return new Promise((resolve, reject) => {
      const startupTimeout = this.startupTimeout;
      const timeout = setTimeout(
        () => reject(new Error(`Log message "${this.message}" not received after ${startupTimeout}ms`)),
        startupTimeout
      );

      const comparisonFn: (line: string) => boolean = (line: string) => {
        if (this.message instanceof RegExp) {
          return this.message.test(line);
        } else {
          return line.includes(this.message);
        }
      };

      byline(stream)
        .on("data", (line) => {
          if (comparisonFn(line)) {
            stream.destroy();
            clearTimeout(timeout);
            resolve();
          }
        })
        .on("err", (line) => {
          if (comparisonFn(line)) {
            stream.destroy();
            clearTimeout(timeout);
            resolve();
          }
        })
        .on("end", () => {
          stream.destroy();
          clearTimeout(timeout);
          reject(new Error(`Log stream ended and message "${this.message}" was not received`));
        });
    });
  }
}

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Container): Promise<void> {
    log.debug(`Waiting for health check`);

    const retryStrategy = new IntervalRetryStrategy<HealthCheckStatus, Error>(100);

    const status = await retryStrategy.retryUntil(
      async () => (await container.inspect()).healthCheckStatus,
      (status) => status === "healthy" || status === "unhealthy",
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Health check not healthy after ${timeout}ms`);
      },
      this.startupTimeout
    );

    if (status !== "healthy") {
      throw new Error(`Health check failed: ${status}`);
    }
  }
}
