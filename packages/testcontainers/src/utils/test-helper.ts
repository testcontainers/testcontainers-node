import { GetEventsOptions, ImageInspectInfo } from "dockerode";
import { createServer, Server } from "http";
import { createSocket } from "node:dgram";
import fs from "node:fs";
import { EOL } from "node:os";
import path from "node:path";
import { Readable } from "stream";
import { Agent, request } from "undici";
import { IntervalRetry } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { StartedDockerComposeEnvironment } from "../docker-compose-environment/started-docker-compose-environment";
import { GenericContainer } from "../generic-container/generic-container";
import { StartedTestContainer } from "../test-container";

export const getImage = (dirname: string, index = 0): string => {
  return fs
    .readFileSync(path.resolve(dirname, "..", "Dockerfile"), "utf-8")
    .split(EOL)
    [index].split(" ")[1];
};

export const checkContainerIsHealthy = async (container: StartedTestContainer): Promise<void> => {
  const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
  const response = await fetch(`${url}/hello-world`);
  expect(response.status).toBe(200);
};

export const checkContainerIsHealthyTls = async (container: StartedTestContainer): Promise<void> => {
  const url = `https://${container.getHost()}:${container.getMappedPort(8443)}`;
  const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  const response = await request(`${url}/hello-world`, { dispatcher });
  expect(response.statusCode).toBe(200);
};

export const checkContainerIsHealthyUdp = async (container: StartedTestContainer): Promise<void> => {
  const testMessage = "health_check";
  await using client = createSocket("udp4");
  client.send(Buffer.from(testMessage), container.getFirstMappedPort(), container.getHost());
  const logs = await container.logs();
  for await (const log of logs) {
    if (log.includes(testMessage)) {
      return;
    }
  }
};

export const checkEnvironmentContainerIsHealthy = async (
  startedEnvironment: StartedDockerComposeEnvironment,
  containerName: string
): Promise<void> => {
  const container = startedEnvironment.getContainer(containerName);
  await checkContainerIsHealthy(container);
};

export const getDockerEventStream = async (opts: GetEventsOptions = {}): Promise<{ events: Readable } & Disposable> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const events = (await dockerode.getEvents(opts)) as Readable;
  events.setEncoding("utf-8");

  return {
    events,
    [Symbol.dispose]() {
      events.destroy();
    },
  };
};

export const getRunningContainerNames = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const containers = await dockerode.listContainers();
  return containers
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};

export const getStoppedContainerNames = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const containers = await dockerode.listContainers({ all: true });
  return containers
    .filter((container) => container.State === "exited")
    .map((container) => container.Names)
    .reduce((result, containerNames) => [...result, ...containerNames], [])
    .map((containerName) => containerName.replace("/", ""));
};

export const getContainerIds = async (): Promise<string[]> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const containers = await dockerode.listContainers({ all: true });
  return containers.map((container) => container.Id);
};

export const getImageInfo = async (imageName: string): Promise<ImageInspectInfo> => {
  const dockerode = (await getContainerRuntimeClient()).container.dockerode;
  const image = dockerode.getImage(imageName);
  const imageInfo = await image.inspect();
  return imageInfo;
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
  return `${serviceName}-${index}`;
};

export const waitForDockerEvent = async (eventStream: Readable, eventName: string, times = 1) => {
  let currentTimes = 0;
  let pendingData = "";

  const parseDockerEvent = (eventData: string): { status?: string; Action?: string } | undefined => {
    try {
      return JSON.parse(eventData);
    } catch {
      return undefined;
    }
  };

  return new Promise<void>((resolve) => {
    const onData = (data: string | Buffer) => {
      // Docker events can be emitted as ndjson or json-seq; normalize both to line-delimited JSON.
      pendingData += data.toString().split(String.fromCharCode(30)).join("\n");

      const lines = pendingData.split("\n");
      pendingData = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseDockerEvent(line);
        const action = event?.status ?? event?.Action;

        if (action === eventName) {
          if (++currentTimes === times) {
            eventStream.off("data", onData);
            resolve();
            return;
          }
        }
      }
    };

    eventStream.on("data", onData);
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

export async function stopStartingContainer(container: GenericContainer, name: string) {
  const client = await getContainerRuntimeClient();
  const containerStartPromise = container.start();

  const status = await new IntervalRetry<boolean, boolean>(500).retryUntil(
    () =>
      client.container
        .getById(name)
        .inspect()
        .then((i) => i.State.Running)
        .catch(() => false),
    (status) => status,
    () => false,
    10000
  );

  if (!status) throw Error("failed start container");

  await client.container.getById(name).stop();
  await containerStartPromise;
}

export async function createTestServer(port: number): Promise<Server> {
  const server = createServer((req, res) => {
    res.writeHead(200);
    res.end("hello world");
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return server;
}
