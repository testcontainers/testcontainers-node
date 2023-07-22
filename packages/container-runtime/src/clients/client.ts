import { ComposeClient } from "./compose/compose-client";
import { ContainerClient } from "./container/container-client";
import { ImageClient } from "./image/image-client";
import { NetworkClient } from "./network/network-client";
import { ContainerRuntimeClientStrategy } from "../strategies/strategy";
import { ConfigurationStrategy } from "../strategies/configuration-strategy";
import { TestcontainersHostStrategy } from "../strategies/testcontainers-host-strategy";
import { UnixSocketStrategy } from "../strategies/unix-socket-strategy";
import { RootlessUnixSocketStrategy } from "../strategies/rootless-unix-socket-strategy";
import { NpipeSocketStrategy } from "../strategies/npipe-socket-strategy";
import { Info } from "./types";
import { log } from "@testcontainers/logger";
import Dockerode from "dockerode";
import { streamToString } from "@testcontainers/common";
import { Readable } from "stream";

export class ContainerRuntimeClient {
  constructor(
    public readonly info: Info,
    public readonly compose: ComposeClient,
    public readonly container: ContainerClient,
    public readonly image: ImageClient,
    public readonly network: NetworkClient
  ) {}
}

const strategies: ContainerRuntimeClientStrategy[] = [
  new TestcontainersHostStrategy(),
  new ConfigurationStrategy(),
  new UnixSocketStrategy(),
  new RootlessUnixSocketStrategy(),
  new NpipeSocketStrategy(),
];

let containerRuntimeClient: ContainerRuntimeClient;

export async function getContainerRuntimeClient(): Promise<ContainerRuntimeClient> {
  if (containerRuntimeClient) {
    return containerRuntimeClient;
  }
  for (const strategy of strategies) {
    try {
      log.debug(`Testing container runtime strategy "${strategy.getName()}"...`);
      const client = await strategy.initialise();
      if (client && (await isDockerDaemonReachable(client.container.dockerode))) {
        containerRuntimeClient = client;
        return client;
      }
    } catch {
      log.debug(`Container runtime strategy "${strategy.getName()}" does not work`);
    }
  }
  throw new Error();
}

async function isDockerDaemonReachable(dockerode: Dockerode): Promise<boolean> {
  try {
    const response = await dockerode.ping();
    return (await streamToString(Readable.from(response))) === "OK";
  } catch (err) {
    log.warn(`Docker daemon is not reachable: "${err}"`);
    return false;
  }
}
