import Dockerode from "dockerode";

export const getRunningContainerNames = async (dockerode: Dockerode): Promise<string[]> => {
  const containers = await dockerode.listContainers();
  return containers
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};
