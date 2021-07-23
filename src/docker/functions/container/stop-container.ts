import {log} from "../../../logger";
import Dockerode from "dockerode";

export type StopContainerOptions = {
  timeout: number;
};

export const stopContainer = (container: Dockerode.Container, options: StopContainerOptions): Promise<void> =>
  container
    .stop({
      t: options.timeout / 1000,
    })
    .catch((error) => {
      /* 304 container already stopped */
      if (error.statusCode === 304) {
        log.info(`Container has already been stopped: ${container.id}`);
      } else {
        throw error;
      }
    });
