import { dockerClient } from "../../docker-client";
import Dockerode from "dockerode";
import { Id } from "../../types";

export const getContainerById = async (id: Id): Promise<Dockerode.Container> => {
  const { dockerode } = await dockerClient;
  return dockerode.getContainer(id);
};
