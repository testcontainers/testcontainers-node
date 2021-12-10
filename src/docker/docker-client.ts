import Dockerode, { DockerOptions, NetworkInspectInfo } from "dockerode";
import path from "path";
import { log } from "../logger";
import { Host } from "./types";
import { URL } from "url";
import fs from "fs";
import { runInContainer } from "./functions/run-in-container";
import { logSystemDiagnostics } from "../log-system-diagnostics";
import "../testcontainers-properties-file";

type DockerClient = {
  host: Host;
  dockerode: Dockerode;
};

const getDockerClient = async (): Promise<DockerClient> => {
  const strategies: DockerClientStrategy[] = [
    new ConfigurationStrategy(),
    new UnixSocketStrategy(),
    new NpipeSocketStrategy(),
  ];

  for (const strategy of strategies) {
    if (strategy.isApplicable()) {
      log.debug(`Found applicable Docker client strategy: ${strategy.getName()}`);
      const dockerConfig = strategy.getDockerConfig();
      const dockerode = new Dockerode(createDockerodeOptions(dockerConfig));

      log.debug(`Testing Docker client strategy URI: ${dockerConfig.uri}`);
      if (await isDockerDaemonReachable(dockerode)) {
        const host = await resolveHost(dockerode, dockerConfig.uri);
        log.info(`Using Docker client strategy: ${strategy.getName()}, Docker host: ${host}`);
        logSystemDiagnostics();
        return { host, dockerode };
      } else {
        log.warn(`Docker client strategy ${strategy.getName()} is not reachable`);
      }
    }
  }

  throw new Error("No Docker client strategy found");
};

const createDockerodeOptions = (dockerConfig: DockerConfig) => {
  const dockerOptions: DockerOptions = {};

  if (dockerConfig.isSocket) {
    dockerOptions.socketPath = new URL(dockerConfig.uri).pathname;
  } else {
    dockerOptions.host = dockerConfig.uri;
  }

  if (dockerConfig.ssl) {
    dockerOptions.ca = dockerConfig.ssl.ca;
    dockerOptions.cert = dockerConfig.ssl.cert;
    dockerOptions.key = dockerConfig.ssl.key;
  }

  return dockerOptions;
};

const isDockerDaemonReachable = async (dockerode: Dockerode): Promise<boolean> =>
  (await dockerode.ping()).toString() === "OK";

type DockerConfig = {
  uri: string;
  isSocket: boolean;
  ssl?: {
    ca: string;
    cert: string;
    key: string;
  };
};

interface DockerClientStrategy {
  isApplicable(): boolean;

  getDockerConfig(): DockerConfig;

  getName(): string;
}

class ConfigurationStrategy implements DockerClientStrategy {
  getDockerConfig(): DockerConfig {
    const { DOCKER_HOST, DOCKER_TLS_VERIFY, DOCKER_CERT_PATH } = process.env;

    return {
      uri: DOCKER_HOST!,
      isSocket: false,
      ssl:
        DOCKER_TLS_VERIFY === "1" && DOCKER_CERT_PATH !== undefined
          ? {
              ca: path.resolve(DOCKER_CERT_PATH, "ca.pem"),
              cert: path.resolve(DOCKER_CERT_PATH, "cert.pem"),
              key: path.resolve(DOCKER_CERT_PATH, "key.pem"),
            }
          : undefined,
    };
  }

  isApplicable(): boolean {
    return process.env.DOCKER_HOST !== undefined;
  }

  getName(): string {
    return "ConfigurationStrategy";
  }
}

class UnixSocketStrategy implements DockerClientStrategy {
  getDockerConfig(): DockerConfig {
    return {
      uri: "unix:///var/run/docker.sock",
      isSocket: true,
    };
  }

  isApplicable(): boolean {
    return process.platform === "linux" || process.platform === "darwin";
  }

  getName(): string {
    return "UnixSocketStrategy";
  }
}

class NpipeSocketStrategy implements DockerClientStrategy {
  getDockerConfig(): DockerConfig {
    return {
      uri: "npipe:////./pipe/docker_engine",
      isSocket: true,
    };
  }

  isApplicable(): boolean {
    return process.platform === "win32";
  }

  getName(): string {
    return "NpipeSocketStrategy";
  }
}

const resolveHost = async (dockerode: Dockerode, uri: string): Promise<string> => {
  const { protocol, hostname } = new URL(uri);

  switch (protocol) {
    case "http:":
    case "https:":
    case "tcp:":
      return hostname;
    case "unix:":
    case "npipe:": {
      if (isInContainer()) {
        const gateway = await findGateway(dockerode);
        if (gateway) {
          return gateway;
        }
        const defaultGateway = await findDefaultGateway(dockerode);
        if (defaultGateway) {
          return defaultGateway;
        }
      }
      return "localhost";
    }
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
};

const findGateway = async (dockerode: Dockerode): Promise<string | undefined> => {
  const inspectResult: NetworkInspectInfo = await dockerode.getNetwork("bridge").inspect();
  return inspectResult?.IPAM?.Config?.find((config) => config.Gateway !== undefined)?.Gateway;
};

const findDefaultGateway = async (dockerode: Dockerode): Promise<string | undefined> =>
  runInContainer(dockerode, "alpine:3.5", ["sh", "-c", "ip route|awk '/default/ { print $3 }'"]);

const isInContainer = () => fs.existsSync("/.dockerenv");

export const dockerClient: Promise<DockerClient> = getDockerClient();
