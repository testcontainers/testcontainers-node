import { dockerClient } from "../../docker-client.js";
import Dockerode from "dockerode";
import { log } from "../../../logger.js";
import { LABEL_CONTAINER_HASH } from "../../../labels.js";

export const getContainerById = async (id: string): Promise<Dockerode.Container> => {
  try {
    const { dockerode } = await dockerClient();
    return dockerode.getContainer(id);
  } catch (err) {
    log.error(`Failed to get container by ID: ${err}`);
    throw err;
  }
};

export const getContainerByHash = async (hash: string): Promise<Dockerode.Container | undefined> => {
  try {
    const { dockerode } = await dockerClient();
    const containers = await dockerode.listContainers({
      limit: 1,
      filters: {
        status: ["running"],
        label: [`${LABEL_CONTAINER_HASH}=${hash}`],
      },
    });
    if (containers.length === 0) {
      return undefined;
    } else {
      return await getContainerById(containers[0].Id);
    }
  } catch (err) {
    log.error(`Failed to get container by hash (${hash}): ${err}`);
    throw err;
  }
};
