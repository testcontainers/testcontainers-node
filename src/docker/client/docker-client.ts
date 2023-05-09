import Dockerode from "dockerode";
import { log } from "../../logger";
import { HostIps, lookupHostIps } from "../lookup-host-ips";
import { getSystemInfo } from "../../system-info";
import { RootlessUnixSocketStrategy } from "./strategy/rootless-unix-socket-strategy";
import { streamToString } from "../../stream-utils";
import { Readable } from "stream";
import { resolveHost } from "../resolve-host";
import { DockerClientStrategy } from "./strategy/docker-client-strategy";
import { ConfigurationStrategy } from "./strategy/configuration-strategy";
import { UnixSocketStrategy } from "./strategy/unix-socket-strategy";
import { NpipeSocketStrategy } from "./strategy/npipe-socket-strategy";
import { TestcontainersCloudStrategy } from "./strategy/testcontainers-cloud-strategy";

export type ContainerRuntime = "docker" | "podman";

export type DockerClientStrategyResult = {
  uri: string;
  dockerode: Dockerode;
  composeEnvironment: NodeJS.ProcessEnv;
  allowUserOverrides: boolean;
};

export type DockerClient = DockerClientStrategyResult & {
  containerRuntime: ContainerRuntime;
  host: string;
  hostIps: HostIps;
  indexServerAddress: string;
};

let dockerClient: DockerClient;

export const getDockerClient = async (): Promise<DockerClient> => {
  if (dockerClient) {
    return dockerClient;
  }

  const strategies: DockerClientStrategy[] = [
    new TestcontainersCloudStrategy(),
    new ConfigurationStrategy(),
    new UnixSocketStrategy(),
    new RootlessUnixSocketStrategy(),
    new NpipeSocketStrategy(),
  ];

  for (const strategy of strategies) {
    if (strategy.init) {
      await strategy.init();
    }

    if (strategy.isApplicable()) {
      log.debug(`Found Docker client strategy "${strategy.getName()}"`);
      const { uri, dockerode, composeEnvironment, allowUserOverrides } = await strategy.getDockerClient();

      log.debug(`Testing Docker client strategy "${uri}"...`);
      if (await isDockerDaemonReachable(dockerode)) {
        const indexServerAddress = (await getSystemInfo(dockerode)).dockerInfo.indexServerAddress;
        const containerRuntime: ContainerRuntime = uri.includes("podman.sock") ? "podman" : "docker";
        const host = await resolveHost(dockerode, containerRuntime, indexServerAddress, uri, allowUserOverrides);
        const hostIps = await lookupHostIps(host);
        logDockerClient(strategy.getName(), host, hostIps);

        dockerClient = {
          uri,
          containerRuntime,
          host,
          hostIps,
          dockerode,
          indexServerAddress,
          composeEnvironment,
          allowUserOverrides,
        };
        return dockerClient;
      } else {
        log.warn(`Docker client strategy ${strategy.getName()} is not reachable`);
      }
    }
  }

  throw new Error("No Docker client strategy found");
};

const isDockerDaemonReachable = async (dockerode: Dockerode): Promise<boolean> => {
  try {
    const response = await dockerode.ping();
    return (await streamToString(Readable.from(response))) === "OK";
  } catch (err) {
    log.warn(`Docker daemon is not reachable: ${err}`);
    return false;
  }
};

const logDockerClient = (strategyName: string, host: string, hostIps: HostIps) => {
  if (log.enabled()) {
    const formattedHostIps = hostIps.map((hostIp) => hostIp.address).join(", ");
    log.info(`Using Docker client strategy "${strategyName}", Docker host "${host}" (${formattedHostIps})`);
  }
};
