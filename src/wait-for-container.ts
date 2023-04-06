import Dockerode from "dockerode";
import { BoundPorts } from "./bound-ports";
import { log } from "./logger";
import { stopContainer } from "./docker/functions/container/stop-container";
import { removeContainer } from "./docker/functions/container/remove-container";
import { WaitStrategy } from "./wait-strategy/wait-strategy";

export const waitForContainer = async (
  container: Dockerode.Container,
  waitStrategy: WaitStrategy,
  boundPorts: BoundPorts,
  startTime?: Date
): Promise<void> => {
  log.debug(`Waiting for container to be ready: ${container.id}`);

  try {
    await waitStrategy.waitUntilReady(container, boundPorts, startTime);
    log.info(`Container is ready: ${container.id}`);
  } catch (err) {
    log.error(`Container failed to be ready: ${container.id}: ${err}`);
    try {
      await stopContainer(container, { timeout: 0 });
      await removeContainer(container, { removeVolumes: true });
    } catch (stopErr) {
      log.error(`Failed to stop container after it failed to be ready: ${container.id}: ${stopErr}`);
    }
    throw err;
  }
};
