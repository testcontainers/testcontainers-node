import Dockerode from "dockerode";
import { IntervalRetry, log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for health check...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();

    const status = await new IntervalRetry<string | undefined, Error>(100).retryUntil(
      async () => (await client.container.inspect(container)).State.Health?.Status,
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
