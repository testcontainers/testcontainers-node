import type Dockerode from "dockerode";
import { log } from "../../common";

export const removeFailedContainer = async (container: Dockerode.Container): Promise<void> => {
  try {
    log.debug(`Removing container...`, { containerId: container.id });
    await container.remove({ force: true, v: true });
    log.debug(`Removed container`, { containerId: container.id });
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      log.debug(`Container already removed`, { containerId: container.id });
    } else {
      log.error(`Failed to remove container: ${err}`, { containerId: container.id });
    }
  }
};
