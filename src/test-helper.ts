import { Readable } from "stream";
import { ReaperInstance } from "./reaper";
import { dockerode } from "./docker/dockerode";

export const getEvents = async (): Promise<Readable> => {
  const events = (await dockerode.getEvents()) as Readable;
  events.setEncoding("utf-8");
  return events;
};

export const getRunningContainerNames = async (): Promise<string[]> => {
  const containers = await dockerode.listContainers();
  return containers
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};

export const getRunningContainerIds = async (): Promise<string[]> => {
  const containers = await dockerode.listContainers();
  return containers.map((container) => container.Id);
};

export const getRunningNetworkIds = async (): Promise<string[]> => {
  const networks = await dockerode.listNetworks();
  return networks.map((network) => network.Id);
};

export const getVolumeNames = async (): Promise<string[]> => {
  const { Volumes: volumes } = await dockerode.listVolumes();
  return volumes.map((volume) => volume.Name);
};

export const getReaperContainerId = async (): Promise<string> => {
  return (await ReaperInstance.getInstance()).getContainerId();
};

export const stopReaper = async (): Promise<void> => {
  return ReaperInstance.stopInstance();
};
