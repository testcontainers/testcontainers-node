import Dockerode from "dockerode";
import { log } from "../../../logger";

export const startContainer = (container: Dockerode.Container): Promise<void> => {
  try {
    return container.start();
  } catch (err) {
    log.error(`Failed to start container ${container.id}: ${err}`);
    throw err;
  }
};
