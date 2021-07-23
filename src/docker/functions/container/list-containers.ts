import Dockerode from "dockerode";
import { dockerode } from "../../dockerode";

export const listContainers = async (): Promise<Dockerode.ContainerInfo[]> => {
  try {
    return await dockerode.listContainers();
  } catch (err) {
    throw err;
  }
};
