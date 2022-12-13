import byline from "byline";
import { BoundPorts } from "./bound-ports";
import { log } from "./logger";
import { HostPortCheck, InternalPortCheck, PortCheck } from "./port-check";
import { IntervalRetryStrategy } from "./retry-strategy";
import { HealthCheckStatus } from "./docker/types";
import Dockerode from "dockerode";
import { containerLogs } from "./docker/functions/container/container-logs";
import { inspectContainer } from "./docker/functions/container/inspect-container";

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void>;

  withStartupTimeout(startupTimeout: number): WaitStrategy;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = 60_000;

  public abstract waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void>;

  public withStartupTimeout(startupTimeout: number): WaitStrategy {
    this.startupTimeout = startupTimeout;
    return this;
  }
}

export class HostPortWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly hostPortCheck: PortCheck, private readonly internalPortCheck: PortCheck) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    await Promise.all([this.waitForHostPorts(container, boundPorts), this.waitForInternalPorts(container, boundPorts)]);
  }

  private async waitForHostPorts(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    for (const [, hostPort] of boundPorts.iterator()) {
      log.debug(`Waiting for host port ${hostPort} for ${container.id}`);
      await this.waitForPort(container, hostPort, this.hostPortCheck);
      log.debug(`Host port ${hostPort} ready for ${container.id}`);
    }
  }

  private async waitForInternalPorts(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    for (const [internalPort] of boundPorts.iterator()) {
      log.debug(`Waiting for internal port ${internalPort} for ${container.id}`);
      await this.waitForPort(container, internalPort, this.internalPortCheck);
      log.debug(`Internal port ${internalPort} ready for ${container.id}`);
    }
  }

  private async waitForPort(container: Dockerode.Container, port: number, portCheck: PortCheck): Promise<void> {
    const retryStrategy = new IntervalRetryStrategy<boolean, Error>(100);

    await retryStrategy.retryUntil(
      () => portCheck.isBound(port),
      (isBound) => isBound,
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Port ${port} not bound after ${timeout}ms for ${container.id}`);
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

  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for log message "${this.message}"`);
    const stream = await containerLogs(container);

    return new Promise((resolve, reject) => {
      const startupTimeout = this.startupTimeout;
      const timeout = setTimeout(() => {
        const message = `Log message "${this.message}" not received after ${startupTimeout}ms for ${container.id}`;
        log.error(message);
        reject(new Error(message));
      }, startupTimeout);

      const comparisonFn: (line: string) => boolean = (line: string) => {
        if (this.message instanceof RegExp) {
          return this.message.test(line);
        } else {
          return line.includes(this.message);
        }
      };

      const lineProcessor = (line: string) => {
        if (comparisonFn(line)) {
          stream.destroy();
          clearTimeout(timeout);
          resolve();
        }
      };

      byline(stream)
        .on("data", lineProcessor)
        .on("err", lineProcessor)
        .on("end", () => {
          stream.destroy();
          clearTimeout(timeout);
          reject(new Error(`Log stream ended and message "${this.message}" was not received for ${container.id}`));
        });
    });
  }
}

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for health check`);

    const retryStrategy = new IntervalRetryStrategy<HealthCheckStatus, Error>(100);

    const status = await retryStrategy.retryUntil(
      async () => (await inspectContainer(container)).healthCheckStatus,
      (healthCheckStatus) => healthCheckStatus === "healthy" || healthCheckStatus === "unhealthy",
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Health check not healthy after ${timeout}ms for ${container.id}`);
      },
      this.startupTimeout
    );

    if (status !== "healthy") {
      throw new Error(`Health check failed: ${status} for ${container.id}`);
    }
  }
}

export const defaultWaitStrategy = (host: string, container: Dockerode.Container) =>
  new HostPortWaitStrategy(new HostPortCheck(host), new InternalPortCheck(container));
