import { log } from "../../../logger";
import Dockerode from "dockerode";

export type StopContainerOptions = {
  timeout: number;
};

export const stopContainer = async (container: Dockerode.Container, options: StopContainerOptions): Promise<void> => {
  try {
    await container.stop({ t: options.timeout / 1000 });
  } catch (err) {
    if (err.statusCode === 304) {
      log.info(`Container has already been stopped: ${container.id}`);
    } else {
      log.error(`Failed to stop container ${container.id}: ${err}`);
      throw err;
    }
  }
};
