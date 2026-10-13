import type Dockerode from "dockerode";
import { log, poll } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
import { getHealthCheckStatusFromInspect } from "./utils/health-check";
import { AbstractWaitStrategy } from "./wait-strategy";

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(
    container: Dockerode.Container,
    _boundPorts?: BoundPorts,
    _startTime?: Date,
    startupSignal?: AbortSignal
  ): Promise<void> {
    log.debug(`Waiting for health check...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();

    const status = await poll(
      async ({ signal }) => getHealthCheckStatusFromInspect(await client.container.inspect(container, { signal })),
      {
        until: (healthCheckStatus) => healthCheckStatus === "healthy" || healthCheckStatus === "unhealthy",
        intervalMs: 100,
        timeoutMs: this.startupTimeoutMs,
        timeoutMessage: `Health check not healthy after ${this.startupTimeoutMs}ms`,
        retryOnError: false,
        signal: startupSignal,
      }
    );

    if (status !== "healthy") {
      const message = `Health check failed: ${status}`;
      log.error(message, { containerId: container.id });
      throw new Error(message);
    }

    log.debug(`Health check wait strategy complete`, { containerId: container.id });
  }
}
