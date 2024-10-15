import { ComposeClient, getComposeClient } from "./compose/compose-client.ts";
import { ContainerClient } from "./container/container-client.ts";
import { ImageClient } from "./image/image-client.ts";
import { NetworkClient } from "./network/network-client.ts";
import { ContainerRuntimeClientStrategy } from "../strategies/strategy.ts";
import { ConfigurationStrategy } from "../strategies/configuration-strategy.ts";
import { TestcontainersHostStrategy } from "../strategies/testcontainers-host-strategy.ts";
import { UnixSocketStrategy } from "../strategies/unix-socket-strategy.ts";
import { RootlessUnixSocketStrategy } from "../strategies/rootless-unix-socket-strategy.ts";
import { NpipeSocketStrategy } from "../strategies/npipe-socket-strategy.ts";
import { ComposeInfo, ContainerRuntimeInfo, Info, NodeInfo } from "./types.ts";
import Dockerode, { DockerOptions } from "dockerode";
import { getRemoteContainerRuntimeSocketPath } from "../utils/remote-container-runtime-socket-path.ts";
import { resolveHost } from "../utils/resolve-host.ts";
import { PodmanContainerClient } from "./container/podman-container-client.ts";
import { DockerContainerClient } from "./container/docker-container-client.ts";
import { DockerImageClient } from "./image/docker-image-client.ts";
import { DockerNetworkClient } from "./network/docker-network-client.ts";
import { lookupHostIps } from "../utils/lookup-host-ips.ts";
import { isDefined, isEmptyString, log } from "../../common/index.ts";
import { LIB_VERSION } from "../../version.ts";
import process from "node:process";

export class ContainerRuntimeClient {
  constructor(
    public readonly info: Info,
    public readonly compose: ComposeClient,
    public readonly container: ContainerClient,
    public readonly image: ImageClient,
    public readonly network: NetworkClient
  ) {}
}

let containerRuntimeClient: ContainerRuntimeClient;

export async function getContainerRuntimeClient(): Promise<ContainerRuntimeClient> {
  if (containerRuntimeClient) {
    return containerRuntimeClient;
  }

  const strategies: ContainerRuntimeClientStrategy[] = [
    new TestcontainersHostStrategy(),
    new ConfigurationStrategy(),
    new UnixSocketStrategy(),
    new RootlessUnixSocketStrategy(),
    new NpipeSocketStrategy(),
  ];

  for (const strategy of strategies) {
    try {
      console.log(`Checking container runtime strategy "${strategy.getName()}"...`);
      const client = await initStrategy(strategy);
      if (client) {
        console.log(`Container runtime strategy "${strategy.getName()}" works`);
        containerRuntimeClient = client;
        return client;
      }
    } catch (err) {
      console.log(`Container runtime strategy "${strategy.getName()}" does not work: "${err}"`);
      if (err !== null && typeof err === "object" && "stack" in err && typeof err.stack === "string") {
        console.log(err.stack);
      }
    }
  }
  throw new Error("Could not find a working container runtime strategy");
}

async function initStrategy(strategy: ContainerRuntimeClientStrategy): Promise<ContainerRuntimeClient | undefined> {
  const result = await strategy.getResult();

  if (!result) {
    log.debug(`Container runtime strategy "${strategy.getName()}" is not applicable`);
    return undefined;
  }

  const dockerodeOptions: DockerOptions = {
    ...result.dockerOptions,
    headers: { ...result.dockerOptions.headers, "User-Agent": `tc-node/${LIB_VERSION}` },
  };
  const dockerode = new Dockerode(dockerodeOptions);

  console.log("Fetching Docker info...");
  const dockerodeInfo = await dockerode.info();

  const indexServerAddress =
    !isDefined(dockerodeInfo.IndexServerAddress) || isEmptyString(dockerodeInfo.IndexServerAddress)
      ? "https://index.docker.io/v1/"
      : dockerodeInfo.IndexServerAddress;

  console.log("Fetching remote container runtime socket path...");
  const remoteContainerRuntimeSocketPath = getRemoteContainerRuntimeSocketPath(result, dockerodeInfo.OperatingSystem);

  log.trace("Resolving host...");
  const host = await resolveHost(dockerode, result, indexServerAddress);

  log.trace("Fetching Compose info...");
  const composeClient = await getComposeClient(result.composeEnvironment);

  const nodeInfo: NodeInfo = {
    version: process.version,
    architecture: process.arch,
    platform: process.platform,
  };

  console.log("Looking up host IPs...");
  const hostIps = await lookupHostIps(host);
  console.log(hostIps)
  log.trace("Initialising clients...");
  const containerClient = result.uri.includes("podman.sock")
    ? new PodmanContainerClient(dockerode)
    : new DockerContainerClient(dockerode);
  const imageClient = new DockerImageClient(dockerode, indexServerAddress);
  const networkClient = new DockerNetworkClient(dockerode);

  const containerRuntimeInfo: ContainerRuntimeInfo = {
    host,
    hostIps,
    remoteSocketPath: remoteContainerRuntimeSocketPath,
    indexServerAddress: indexServerAddress,
    serverVersion: dockerodeInfo.ServerVersion,
    operatingSystem: dockerodeInfo.OperatingSystem,
    operatingSystemType: dockerodeInfo.OSType,
    architecture: dockerodeInfo.Architecture,
    cpus: dockerodeInfo.NCPU,
    memory: dockerodeInfo.MemTotal,
    runtimes: dockerodeInfo.Runtimes ? Object.keys(dockerodeInfo.Runtimes) : [],
    labels: dockerodeInfo.Labels ? dockerodeInfo.Labels : [],
  };

  const composeInfo: ComposeInfo = composeClient.info;

  const info: Info = { node: nodeInfo, containerRuntime: containerRuntimeInfo, compose: composeInfo };

  log.trace(`Container runtime info:\n${JSON.stringify(info, null, 2)}`);
  return new ContainerRuntimeClient(info, composeClient, containerClient, imageClient, networkClient);
}
