import Dockerode from "dockerode";
import { log } from "../../logger";
import { HostIps, lookupHostIps } from "../lookup-host-ips";
import { getSystemInfo, SystemInfo } from "../../system-info";
import { RootlessUnixSocketStrategy } from "./strategy/rootless-unix-socket-strategy";
import { streamToString } from "../../stream-utils";
import { Readable } from "stream";
import { resolveHost } from "../resolve-host";
import { DockerClientStrategy } from "./strategy/docker-client-strategy";
import { ConfigurationStrategy } from "./strategy/configuration-strategy";
import { UnixSocketStrategy } from "./strategy/unix-socket-strategy";
import { NpipeSocketStrategy } from "./strategy/npipe-socket-strategy";
import { ContainerRuntime } from "../types";

export type DockerClient = DockerClientStrategyResult & {
  host: string;
  containerRuntime: ContainerRuntime;
  hostIps: HostIps;
  info: SystemInfo;
};

export type DockerClientStrategyResult = {
  uri: string;
  dockerode: Dockerode;
  composeEnvironment: NodeJS.ProcessEnv;
};

let dockerClient: DockerClient;

export async function getDockerClient(): Promise<DockerClient> {
  if (dockerClient) {
    return dockerClient;
  }

  const strategies: DockerClientStrategy[] = [
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
      const { uri, dockerode, composeEnvironment } = await strategy.getDockerClient();

      log.debug(`Testing Docker client strategy "${uri}"...`);
      if (await isDockerDaemonReachable(dockerode)) {
        const info = await getSystemInfo(dockerode);
        const containerRuntime: ContainerRuntime = uri.includes("podman.sock") ? "podman" : "docker";
        const host = await resolveHost(dockerode, containerRuntime, info.dockerInfo.indexServerAddress, uri);
        const hostIps = await lookupHostIps(host);
        logDockerClient(strategy.getName(), host, hostIps);
        dockerClient = { uri, containerRuntime, host, hostIps, dockerode, info, composeEnvironment };
        return dockerClient;
      } else {
        log.warn(`Docker client strategy "${strategy.getName()}" is not working`);
      }
    }
  }

  throw new Error("No Docker client strategy found");
}

async function isDockerDaemonReachable(dockerode: Dockerode): Promise<boolean> {
  try {
    const response = await dockerode.ping();
    return (await streamToString(Readable.from(response))) === "OK";
  } catch (err) {
    log.warn(`Docker daemon is not reachable: ${err}`);
    return false;
  }
}

function logDockerClient(strategyName: string, host: string, hostIps: HostIps) {
  if (!log.enabled()) {
    return;
  }
  const formattedHostIps = hostIps.map((hostIp) => hostIp.address).join(", ");
  log.info(`Using Docker client strategy "${strategyName}", Docker host "${host}" (${formattedHostIps})`);
}
