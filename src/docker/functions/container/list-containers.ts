import Dockerode from "dockerode";
import { dockerClient } from "../../client/docker-client";
import { log } from "../../../logger";

export const listContainers = async (): Promise<Dockerode.ContainerInfo[]> => {
  try {
    const { dockerode } = await dockerClient();
    return await dockerode.listContainers();
  } catch (err) {
    log.error(`Failed to list containers: ${err}`);
    throw err;
  }
};
