import Dockerode from "dockerode";

export const getRunningContainerNames = async (dockerode: Dockerode): Promise<string[]> => {
  const containers = await dockerode.listContainers();
  return containers
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};

export const getRunningContainerIds = async (dockerode: Dockerode): Promise<string[]> => {
  const containers = await dockerode.listContainers();
  return containers.map((container) => container.Id);
};

export const getRunningNetworkIds = async (dockerode: Dockerode): Promise<string[]> => {
  const networks = await dockerode.listNetworks();
  return networks.map((network) => network.Id);
};

export const getImagesRepoTags = async (dockerode: Dockerode): Promise<string[]> => {
  const images = await dockerode.listImages();
  return images.map((image) => image.RepoTags[0]);
};
