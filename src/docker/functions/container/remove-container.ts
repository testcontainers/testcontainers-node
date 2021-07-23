import Dockerode from "dockerode";
import { log } from "../../../logger";

export type RemoveContainerOptions = {
  removeVolumes: boolean;
};

export const removeContainer = (container: Dockerode.Container, options: RemoveContainerOptions): Promise<void> => {
  try {
    return container.remove({ v: options.removeVolumes });
  } catch (err) {
    log.error(`Failed to remove container ${container.id}: ${err}`);
    throw err;
  }
};
