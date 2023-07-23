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
import { log } from "@testcontainers/common";

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
      if (client && (await client.container.ping()) === "OK") {
        log.debug(`Container runtime strategy "${strategy.getName()}" works`);
        containerRuntimeClient = client;
        return client;
      }
    } catch {
      log.debug(`Container runtime strategy "${strategy.getName()}" does not work`);
    }
  }
  throw new Error();
}
