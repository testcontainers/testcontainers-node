import Dockerode from "dockerode";
import { AbstractWaitStrategy } from "./wait-strategy";
import { log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { Readable } from "stream";

export class HealthCheckWaitStrategy extends AbstractWaitStrategy {
  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for health check...`, { containerId: container.id });

    const client = await getContainerRuntimeClient();
    const dockerode = client.container.dockerode;
    const events = (await dockerode.getEvents({
      filters: {
        type: ["container"],
        container: [container.id],
        event: ["health_status"],
      },
    })) as Readable;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const message = `Health check not healthy after ${this.startupTimeout}ms`;
        log.error(message, { containerId: container.id });
        events.destroy();
        reject(new Error(message));
      }, this.startupTimeout);

      events.on("data", (data) => {
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
        events.destroy();
        log.debug(`Health check wait strategy complete`, { containerId: container.id });
      });
    });
  }
}
