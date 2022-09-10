import Dockerode, { DockerOptions, NetworkInspectInfo } from "dockerode";
import path from "path";
import { log } from "../logger";
import { Host } from "./types";
import { URL } from "url";
import { existsSync, promises as fs } from "fs";
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
      const { uri, dockerode } = await strategy.initialise();
      log.debug(`Testing Docker client strategy URI: ${uri}`);
      if (await isDockerDaemonReachable(dockerode)) {
        const host = await resolveHost(dockerode, uri);
        log.info(`Using Docker client strategy: ${strategy.getName()}, Docker host: ${host}`);
        logSystemDiagnostics(dockerode);
        return { host, dockerode };
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
    return response.toString() === "OK";
  } catch (err) {
    log.warn(`Docker daemon is not reachable: ${err}`);
    return false;
  }
};

interface DockerClientStrategy {
  isApplicable(): boolean;

  initialise(): Promise<{ uri: string; dockerode: Dockerode }>;

  getName(): string;
}

class ConfigurationStrategy implements DockerClientStrategy {
  async initialise(): Promise<{ uri: string; dockerode: Dockerode }> {
    const { DOCKER_HOST, DOCKER_TLS_VERIFY, DOCKER_CERT_PATH } = process.env;

    const dockerOptions: DockerOptions = {};

    const { pathname, hostname, port } = new URL(DOCKER_HOST!);
    if (hostname !== "") {
      dockerOptions.host = hostname;
      dockerOptions.port = port;
    } else {
      dockerOptions.socketPath = pathname;
    }

    if (DOCKER_TLS_VERIFY === "1" && DOCKER_CERT_PATH !== undefined) {
      dockerOptions.ca = await fs.readFile(path.resolve(DOCKER_CERT_PATH, "ca.pem"));
      dockerOptions.cert = await fs.readFile(path.resolve(DOCKER_CERT_PATH, "cert.pem"));
      dockerOptions.key = await fs.readFile(path.resolve(DOCKER_CERT_PATH, "key.pem"));
    }

    return {
      uri: DOCKER_HOST!,
      dockerode: new Dockerode(dockerOptions),
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
  async initialise(): Promise<{ uri: string; dockerode: Dockerode }> {
    return {
      uri: "unix:///var/run/docker.sock",
      dockerode: new Dockerode({ socketPath: "/var/run/docker.sock" }),
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
  async initialise(): Promise<{ uri: string; dockerode: Dockerode }> {
    return {
      uri: "npipe:////./pipe/docker_engine",
      dockerode: new Dockerode({ socketPath: "//./pipe/docker_engine" }),
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
  if (process.env.TESTCONTAINERS_HOST_OVERRIDE !== undefined) {
    return process.env.TESTCONTAINERS_HOST_OVERRIDE;
  }

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
        if (gateway !== undefined) {
          return gateway;
        }
        const defaultGateway = await findDefaultGateway(dockerode);
        if (defaultGateway !== undefined) {
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
  log.debug(`Checking gateway for Docker host`);
  const inspectResult: NetworkInspectInfo = await dockerode.getNetwork("bridge").inspect();
  return inspectResult?.IPAM?.Config?.find((config) => config.Gateway !== undefined)?.Gateway;
};

const findDefaultGateway = async (dockerode: Dockerode): Promise<string | undefined> => {
  log.debug(`Checking default gateway for Docker host`);
  return runInContainer(dockerode, "alpine:3.14", ["sh", "-c", "ip route|awk '/default/ { print $3 }'"]);
};

const isInContainer = () => existsSync("/.dockerenv");

let _dockerClient: Promise<DockerClient>;

export const dockerClient: () => Promise<DockerClient> = () => {
  if (!_dockerClient) {
    _dockerClient = getDockerClient();
  }
  return _dockerClient;
};
