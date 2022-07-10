import { dockerClient } from "../../docker-client";
import Dockerode from "dockerode";
import { Id } from "../../types";
import { log } from "../../../logger";
import { LABEL_CONTAINER_HASH } from "../../../labels";

export const getContainerById = async (id: Id): Promise<Dockerode.Container> => {
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
