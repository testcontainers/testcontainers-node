import Dockerode from "dockerode";
import { log } from "../logger";
import { IntervalRetryStrategy } from "../retry-strategy";
import { HealthCheckStatus } from "../docker/types";
import { inspectContainer } from "../docker/functions/container/inspect-container";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for health check...`, { containerId: container.id });

    const status = await new IntervalRetryStrategy<HealthCheckStatus, Error>(100).retryUntil(
      async () => (await inspectContainer(container)).healthCheckStatus,
      (healthCheckStatus) => healthCheckStatus === "healthy" || healthCheckStatus === "unhealthy",
      () => {
        const timeout = this.startupTimeout;
        const message = `Health check not healthy after ${timeout}ms`;
        log.error(message, { containerId: container.id });
        throw new Error(message);
      },
      this.startupTimeout
    );

    if (status !== "healthy") {
      const message = `Health check failed: ${status}`;
      log.error(message, { containerId: container.id });
      throw new Error(message);
    }

    log.debug(`Health check wait strategy complete`, { containerId: container.id });
  }
}
