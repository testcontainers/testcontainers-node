import Dockerode from "dockerode";
import { log } from "../logger";
import { IntervalRetryStrategy } from "../retry-strategy";
import { HealthCheckStatus } from "../docker/types";
import { inspectContainer } from "../docker/functions/container/inspect-container";
import { AbstractWaitStrategy, DEFAULT_STARTUP_TIMEOUT } from "./wait-strategy";

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for health check for ${container.id}`);

    const status = await new IntervalRetryStrategy<HealthCheckStatus, Error>(100).retryUntil(
      async () => (await inspectContainer(container)).healthCheckStatus,
      (healthCheckStatus) => healthCheckStatus === "healthy" || healthCheckStatus === "unhealthy",
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Health check not healthy after ${timeout}ms for ${container.id}`);
      },
      this.startupTimeout ?? DEFAULT_STARTUP_TIMEOUT
    );

    if (status !== "healthy") {
      throw new Error(`Health check failed: ${status} for ${container.id}`);
    }
  }
}
