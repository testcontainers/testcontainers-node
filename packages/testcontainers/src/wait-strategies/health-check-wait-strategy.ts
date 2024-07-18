import Dockerode from "dockerode";
import { AbstractWaitStrategy } from "./wait-strategy";
import { log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for health check...`, { containerId: container.id });

    const client = await getContainerRuntimeClient();
    const containerEvents = await client.container.events(container, ["health_status"]);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const message = `Health check not healthy after ${this.startupTimeout}ms`;
        log.error(message, { containerId: container.id });
        containerEvents.destroy();
        reject(new Error(message));
      }, this.startupTimeout);

      containerEvents.on("data", (data) => {
        const parsedData = JSON.parse(data);
        const status = parsedData.status.split(":").pop().trim();

        if (status === "healthy") {
          resolve();
        } else {
          const message = `Health check failed: ${status}`;
          log.error(message, { containerId: container.id });
          reject(new Error(message));
        }

        clearTimeout(timeout);
        containerEvents.destroy();
        log.debug(`Health check wait strategy complete`, { containerId: container.id });
      });
    });
  }
}
