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

export type Provider = "docker" | "podman";

export type DockerClient = {
  uri: string;
  provider: Provider;
  host: string;
  hostIps: HostIps;
  dockerode: Dockerode;
  indexServerAddress: string;
  composeEnvironment: NodeJS.ProcessEnv;
};

export type DockerClientInit = {
  uri: string;
  dockerode: Dockerode;
  composeEnvironment: NodeJS.ProcessEnv;
};

const getDockerClient = async (): Promise<DockerClient> => {
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
        const indexServerAddress = (await getSystemInfo(dockerode)).dockerInfo.indexServerAddress;
        const provider: Provider = uri.includes("podman.sock") ? "podman" : "docker";
        const host = await resolveHost(dockerode, provider, indexServerAddress, uri);
        const hostIps = await lookupHostIps(host);
        log.info(
          `Using Docker client strategy "${strategy.getName()}", Docker host "${host}" (${hostIps
            .map((hostIp) => hostIp.address)
            .join(", ")})`
        );
        return { uri, provider, host, hostIps, dockerode, indexServerAddress, composeEnvironment };
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

let _dockerClient: Promise<DockerClient>;

export const dockerClient: () => Promise<DockerClient> = () => {
  if (!_dockerClient) {
    _dockerClient = getDockerClient();
  }
  return _dockerClient;
};
