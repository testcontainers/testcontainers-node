import { Readable } from "stream";
import { StartedDockerComposeEnvironment } from "./docker-compose-environment/started-docker-compose-environment";
import fetch from "node-fetch";
import { StartedTestContainer } from "./test-container";
import https from "https";
import { GetEventsOptions } from "dockerode";
import { getContainerRuntimeClient } from "@testcontainers/container-runtime";

export const checkContainerIsHealthy = async (container: StartedTestContainer): Promise<void> => {
  const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
  const response = await fetch(`${url}/hello-world`);
  expect(response.status).toBe(200);
};

export const checkContainerIsHealthyTls = async (container: StartedTestContainer): Promise<void> => {
  const url = `https://${container.getHost()}:${container.getMappedPort(8443)}`;
  const agent = new https.Agent({ rejectUnauthorized: false });
  const response = await fetch(`${url}/hello-world`, { agent });
  expect(response.status).toBe(200);
};

export const checkEnvironmentContainerIsHealthy = async (
  startedEnvironment: StartedDockerComposeEnvironment,
  containerName: string
): Promise<void> => {
  const container = startedEnvironment.getContainer(containerName);
  await checkContainerIsHealthy(container);
};

export const getDockerEventStream = async (opts: GetEventsOptions = {}): Promise<Readable> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const events = (await dockerode.getEvents(opts)) as Readable;
  events.setEncoding("utf-8");
  return events;
};

export const getRunningContainerNames = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const containers = await dockerode.listContainers();
  return containers
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};

export const getContainerIds = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const containers = await dockerode.listContainers({ all: true });
  return containers.map((container) => container.Id);
};

export const checkImageExists = async (imageName: string): Promise<boolean> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  try {
    await dockerode.getImage(imageName.toString()).inspect();
    return true;
  } catch (err) {
    return false;
  }
};

export const getRunningNetworkIds = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const networks = await dockerode.listNetworks();
  return networks.map((network) => network.Id);
};

export const getVolumeNames = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const { Volumes: volumes } = await dockerode.listVolumes();
  return volumes.map((volume) => volume.Name);
};

export const composeContainerName = async (serviceName: string, index = 1): Promise<string> => {
  const client = await getContainerRuntimeClient();
  return client.info.compose?.version.startsWith("1.") ? `${serviceName}_${index}` : `${serviceName}-${index}`;
};

export const waitForDockerEvent = async (eventStream: Readable, eventName: string, times = 1) => {
  let currentTimes = 0;
  return new Promise<void>((resolve) => {
    eventStream.on("data", (data) => {
      try {
        if (JSON.parse(data).status === eventName) {
          if (++currentTimes === times) {
            resolve();
          }
        }
      } catch (err) {
        // ignored
      }
    });
  });
};

export async function getImageLabelsByName(imageName: string): Promise<{ [label: string]: string }> {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const imageInfo = await dockerode.getImage(imageName).inspect();
  return imageInfo.Config.Labels;
}

export async function deleteImageByName(imageName: string): Promise<void> {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  await dockerode.getImage(imageName).remove();
}
