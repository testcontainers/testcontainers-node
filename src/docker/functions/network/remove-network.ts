import { log } from "../../../logger";
import { dockerode } from "../../dockerode";

export const removeNetwork = async (id: string): Promise<void> => {
  log.info(`Removing network ${id}`);

  const network = dockerode.getNetwork(id);

  const { message } = await network.remove();
  if (message) {
    log.warn(message);
  }
};
