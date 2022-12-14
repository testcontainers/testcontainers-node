import Dockerode from "dockerode";
import { BoundPorts } from "./bound-ports";
import { log } from "./logger";
import { stopContainer } from "./docker/functions/container/stop-container";
import { removeContainer } from "./docker/functions/container/remove-container";
import { WaitStrategy } from "./wait-strategy";

export const waitForContainer = async (
  container: Dockerode.Container,
  waitStrategy: WaitStrategy,
  host: string,
  boundPorts: BoundPorts
): Promise<void> => {
  log.debug(`Waiting for container to be ready: ${container.id}`);

  try {
    await waitStrategy.waitUntilReady(container, host, boundPorts);
    log.info("Container is ready");
  } catch (err) {
    log.error(`Container failed to be ready: ${err}`);
    try {
      await stopContainer(container, { timeout: 0 });
      await removeContainer(container, { removeVolumes: true });
    } catch (stopErr) {
      log.error(`Failed to stop container after it failed to be ready: ${stopErr}`);
    }
    throw err;
  }
};
