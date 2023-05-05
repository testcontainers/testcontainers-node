import Dockerode, { DockerOptions } from "dockerode";
import path from "path";
import { log } from "../logger";
import { URL } from "url";
import { existsSync, promises as fs } from "fs";
import { sessionId } from "./session-id";
import { HostIps, lookupHostIps } from "./lookup-host-ips";
import { getSystemInfo } from "../system-info";
import { RootlessUnixSocketStrategy } from "./rootless-unix-socket-strategy";
import { streamToString } from "../stream-utils";
import { Readable } from "stream";
import { DockerClientConfig, getDockerClientConfig } from "./docker-client-config";
import { resolveHost } from "./resolve-host";

export type Provider = "docker" | "podman";

type DockerClient = {
  uri: string;
  provider: Provider;
  host: string;
  hostIps: HostIps;
  dockerode: Dockerode;
  indexServerAddress: string;
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
      log.debug(`Found potential Docker client strategy "${strategy.getName()}"`);
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

export type DockerClientInit = {
  uri: string;
  dockerode: Dockerode;
  composeEnvironment: NodeJS.ProcessEnv;
};

export interface DockerClientStrategy {
  init?(): Promise<void>;

  isApplicable(): boolean;

  getDockerClient(): Promise<DockerClientInit>;

  getName(): string;
}

class ConfigurationStrategy implements DockerClientStrategy {
  private dockerConfig!: DockerClientConfig;

  async init(): Promise<void> {
    this.dockerConfig = await getDockerClientConfig();
  }

  async getDockerClient(): Promise<DockerClientInit> {
    const { dockerHost, dockerTlsVerify, dockerCertPath } = this.dockerConfig;

    const dockerOptions: DockerOptions = { headers: { "x-tc-sid": sessionId } };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { pathname, hostname, port } = new URL(dockerHost!);
    if (hostname !== "") {
      dockerOptions.host = hostname;
      dockerOptions.port = port;
    } else {
      dockerOptions.socketPath = pathname;
    }

    if (dockerTlsVerify === "1" && dockerCertPath !== undefined) {
      dockerOptions.ca = await fs.readFile(path.resolve(dockerCertPath, "ca.pem"));
      dockerOptions.cert = await fs.readFile(path.resolve(dockerCertPath, "cert.pem"));
      dockerOptions.key = await fs.readFile(path.resolve(dockerCertPath, "key.pem"));
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      uri: dockerHost!,
      dockerode: new Dockerode(dockerOptions),
      composeEnvironment: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        DOCKER_HOST: dockerHost!,
        DOCKER_TLS_VERIFY: dockerTlsVerify,
        DOCKER_CERT_PATH: dockerCertPath,
      },
    };
  }

  isApplicable(): boolean {
    return this.dockerConfig.dockerHost !== undefined;
  }

  getName(): string {
    return "ConfigurationStrategy";
  }
}

class UnixSocketStrategy implements DockerClientStrategy {
  async getDockerClient(): Promise<DockerClientInit> {
    return {
      uri: "unix:///var/run/docker.sock",
      dockerode: new Dockerode({ socketPath: "/var/run/docker.sock" }),
      composeEnvironment: {},
    };
  }

  isApplicable(): boolean {
    return (process.platform === "linux" || process.platform === "darwin") && existsSync("/var/run/docker.sock");
  }

  getName(): string {
    return "UnixSocketStrategy";
  }
}

class NpipeSocketStrategy implements DockerClientStrategy {
  async getDockerClient(): Promise<DockerClientInit> {
    return {
      uri: "npipe:////./pipe/docker_engine",
      dockerode: new Dockerode({ socketPath: "//./pipe/docker_engine" }),
      composeEnvironment: {},
    };
  }

  isApplicable(): boolean {
    return process.platform === "win32";
  }

  getName(): string {
    return "NpipeSocketStrategy";
  }
}

let _dockerClient: Promise<DockerClient>;

export const dockerClient: () => Promise<DockerClient> = () => {
  if (!_dockerClient) {
    _dockerClient = getDockerClient();
  }
  return _dockerClient;
};
