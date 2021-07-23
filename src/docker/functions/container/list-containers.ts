import Dockerode from "dockerode";
import { dockerode } from "../../dockerode";

export const listContainers = async (): Promise<Dockerode.ContainerInfo[]> => {
  return await dockerode.listContainers();
};
