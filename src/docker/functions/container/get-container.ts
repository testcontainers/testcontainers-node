import { getDockerClient } from "../../client/docker-client";
import Dockerode from "dockerode";
import { log } from "@testcontainers/logger";
import { LABEL_TESTCONTAINERS_CONTAINER_HASH } from "../../../labels";

export const getContainerById = async (id: string): Promise<Dockerode.Container> => {
  try {
    const { dockerode } = await getDockerClient();
    return dockerode.getContainer(id);
  } catch (err) {
    log.error(`Failed to get container by ID: ${err}`);
    throw err;
  }
};

export const getContainerByHash = async (hash: string): Promise<Dockerode.Container | undefined> => {
  try {
    const { dockerode } = await getDockerClient();
    const containers = await dockerode.listContainers({
      limit: 1,
      filters: {
        status: ["running"],
        label: [`${LABEL_TESTCONTAINERS_CONTAINER_HASH}=${hash}`],
      },
    });
    if (containers.length === 0) {
      return undefined;
    } else {
      return await getContainerById(containers[0].Id);
    }
  } catch (err) {
    log.error(`Failed to get container by hash "${hash}": ${err}`);
    throw err;
  }
};
