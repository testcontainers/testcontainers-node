import Dockerode from "dockerode";
import { dockerode } from "../../dockerode";
import { log } from "../../../logger";

export const listContainers = async (): Promise<Dockerode.ContainerInfo[]> => {
  try {
    return await dockerode.listContainers();
  } catch (err) {
    log.error(`Failed to list containers: ${err}`);
    throw err;
  }
};
