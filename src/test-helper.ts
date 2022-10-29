import { Readable } from "stream";
import { ReaperInstance } from "./reaper";
import { dockerClient } from "./docker/docker-client";
import { StartedDockerComposeEnvironment } from "./docker-compose-environment/started-docker-compose-environment";
import fetch from "node-fetch";
import { StartedTestContainer } from "./test-container";

export const checkContainerIsHealthy = async (container: StartedTestContainer): Promise<void> => {
  const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
  const response = await fetch(`${url}/hello-world`);
  expect(response.status).toBe(200);
};

export const checkEnvironmentContainerIsHealthy = async (
  startedEnvironment: StartedDockerComposeEnvironment,
  containerName: string
): Promise<void> => {
  const container = startedEnvironment.getContainer(containerName);
  await checkContainerIsHealthy(container);
};

export const getEvents = async (): Promise<Readable> => {
  const { dockerode } = await dockerClient();
  const events = (await dockerode.getEvents()) as Readable;
  events.setEncoding("utf-8");
  return events;
};

export const getRunningContainerNames = async (): Promise<string[]> => {
  const { dockerode } = await dockerClient();
  const containers = await dockerode.listContainers();
  return containers
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};

export const getContainerIds = async (): Promise<string[]> => {
  const { dockerode } = await dockerClient();
  const containers = await dockerode.listContainers({ all: true });
  return containers.map((container) => container.Id);
};

export const getRunningNetworkIds = async (): Promise<string[]> => {
  const { dockerode } = await dockerClient();
  const networks = await dockerode.listNetworks();
  return networks.map((network) => network.Id);
};

export const getVolumeNames = async (): Promise<string[]> => {
  const { dockerode } = await dockerClient();
  const { Volumes: volumes } = await dockerode.listVolumes();
  return volumes.map((volume) => volume.Name);
};

export const getReaperContainerId = async (): Promise<string> => {
  return (await ReaperInstance.getInstance()).getContainerId();
};

export const stopReaper = async (): Promise<void> => {
  return ReaperInstance.stopInstance();
};
