import { ComposeClient, getComposeClient } from "./compose/compose-client";
import { ContainerClient } from "./container/container-client";
import { ImageClient } from "./image/image-client";
import { NetworkClient } from "./network/network-client";
import { ContainerRuntimeClientStrategy } from "../strategies/strategy";
import { ConfigurationStrategy } from "../strategies/configuration-strategy";
import { TestcontainersHostStrategy } from "../strategies/testcontainers-host-strategy";
import { UnixSocketStrategy } from "../strategies/unix-socket-strategy";
import { RootlessUnixSocketStrategy } from "../strategies/rootless-unix-socket-strategy";
import { NpipeSocketStrategy } from "../strategies/npipe-socket-strategy";
import { ComposeInfo, ContainerRuntimeInfo, Info, NodeInfo } from "./types";
import Dockerode, { DockerOptions } from "dockerode";
import { getRemoteContainerRuntimeSocketPath } from "../utils/remote-container-runtime-socket-path";
import { resolveHost } from "../utils/resolve-host";
import { PodmanContainerClient } from "./container/podman-container-client";
import { DockerContainerClient } from "./container/docker-container-client";
import { DockerImageClient } from "./image/docker-image-client";
import { DockerNetworkClient } from "./network/docker-network-client";
import { lookupHostIps } from "../utils/lookup-host-ips";
import { isDefined, isEmptyString, log, RandomUuid } from "../../common";
import { LIB_VERSION } from "../../version";

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
      log.debug(`Testing container runtime strategy "${strategy.getName()}"...`);
      const client = await initStrategy(strategy);
      if (client) {
        log.debug(`Container runtime strategy "${strategy.getName()}" works`);
        containerRuntimeClient = client;
        return client;
      }
    } catch {
      log.debug(`Container runtime strategy "${strategy.getName()}" does not work`);
    }
  }
  throw new Error("Could not find a working container runtime strategy");
}

async function initStrategy(strategy: ContainerRuntimeClientStrategy): Promise<ContainerRuntimeClient | undefined> {
  const result = await strategy.getResult();

  if (!result) {
    return undefined;
  }

  const xTcSid = new RandomUuid().nextUuid();
  log.info(`Setting x-tc-sid header to "${xTcSid}"`);
  const dockerodeOptions: DockerOptions = {
    ...result.dockerOptions,
    headers: {
      ...result.dockerOptions.headers,
      "User-Agent": `tc-node/${LIB_VERSION}`,
      "x-tc-sid": xTcSid,
    },
  };
  const dockerode = new Dockerode(dockerodeOptions);

  const dockerodeInfo = await dockerode.info();
  const indexServerAddress =
    !isDefined(dockerodeInfo.IndexServerAddress) || isEmptyString(dockerodeInfo.IndexServerAddress)
      ? "https://index.docker.io/v1/"
      : dockerodeInfo.IndexServerAddress;
  const remoteContainerRuntimeSocketPath = getRemoteContainerRuntimeSocketPath(result, dockerodeInfo.OperatingSystem);
  const host = await resolveHost(dockerode, result, indexServerAddress);

  const composeClient = await getComposeClient(result.composeEnvironment);
  const containerClient = result.uri.includes("podman.sock")
    ? new PodmanContainerClient(dockerode)
    : new DockerContainerClient(dockerode);
  const imageClient = new DockerImageClient(dockerode, indexServerAddress);
  const networkClient = new DockerNetworkClient(dockerode);

  const nodeInfo: NodeInfo = {
    version: process.version,
    architecture: process.arch,
    platform: process.platform,
  };

  const containerRuntimeInfo: ContainerRuntimeInfo = {
    host,
    hostIps: await lookupHostIps(host),
    remoteSocketPath: remoteContainerRuntimeSocketPath,
    indexServerAddress: indexServerAddress,
    serverVersion: dockerodeInfo.ServerVersion,
    operatingSystem: dockerodeInfo.OperatingSystem,
    operatingSystemType: dockerodeInfo.OSType,
    architecture: dockerodeInfo.Architecture,
    cpus: dockerodeInfo.NCPU,
    memory: dockerodeInfo.MemTotal,
  };

  const composeInfo: ComposeInfo = composeClient.info;

  const info: Info = { node: nodeInfo, containerRuntime: containerRuntimeInfo, compose: composeInfo };

  return new ContainerRuntimeClient(info, composeClient, containerClient, imageClient, networkClient);
}
