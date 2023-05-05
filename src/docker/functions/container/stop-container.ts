import { log } from "../../../logger";
import Dockerode from "dockerode";

export type StopContainerOptions = {
  timeout: number;
};

export const stopContainer = async (container: Dockerode.Container, options: StopContainerOptions): Promise<void> => {
  try {
    await container.stop({ t: options.timeout / 1000 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.statusCode === 304) {
      log.info(`Container has already been stopped`, { containerId: container.id });
    } else {
      log.error(`Failed to stop container: ${err}`, { containerId: container.id });
      throw err;
    }
  }
};
