import type { Container } from "dockerode";
import { log } from "../common";
import type { ContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
import type { WaitStrategy } from "./wait-strategy";

export const waitForContainer = async (
  client: ContainerRuntimeClient,
  container: Container,
  waitStrategy: WaitStrategy,
  boundPorts: BoundPorts,
  startTime?: Date
): Promise<void> => {
  log.debug(`Waiting for container to be ready...`, { containerId: container.id });

  try {
    await waitStrategy.waitUntilReady(container, boundPorts, startTime);
    log.info(`Container is ready`, { containerId: container.id });
  } catch (err) {
    log.error(`Container failed to be ready: ${err}`, { containerId: container.id });
    try {
      await client.container.stop(container, { timeout: 0 });
      await client.container.remove(container, { removeVolumes: true });
    } catch (stopErr) {
      log.error(`Failed to stop container after it failed to be ready: ${stopErr}`, { containerId: container.id });
    }
    throw err;
  }
};
