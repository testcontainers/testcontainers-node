import { log } from "../logger";
import Dockerode, { NetworkInspectInfo } from "dockerode";
import { Host } from "./types";
import { runInContainer } from "./functions/run-in-container";
import fs from "fs";

const DEFAULT_HOST = "localhost";

export const getDockerHost = async (dockerode: Dockerode): Promise<Host> => {
  if (process.env.DOCKER_HOST) {
    log.info(`Detected DOCKER_HOST environment variable: ${process.env.DOCKER_HOST}`);
  }

  for (const hostStrategy of hostStrategies(dockerode)) {
    const result = await hostStrategy();

    if (result && result.host) {
      result.callback();
      return result.host;
    }
  }

  log.info(`Using fallback Docker host: ${DEFAULT_HOST}`);
  return DEFAULT_HOST;
};

type HostStrategy = () => Promise<{ host: Host | undefined; callback: () => void } | undefined>;

const hostStrategies = (dockerode: Dockerode): Array<HostStrategy> => [
  async () => {
    // @ts-ignore
    const host = dockerode.modem.host;
    return { host, callback: () => log.info(`Using Docker host from modem: ${host}`) };
  },

  async () => {
    const host = process.env["TESTCONTAINERS_HOST_OVERRIDE"];
    return { host, callback: () => log.info(`Using TESTCONTAINERS_HOST_OVERRIDE: ${host}`) };
  },

  async () => {
    if (!isInContainer()) {
      return { host: DEFAULT_HOST, callback: () => log.info(`Using default Docker host: ${DEFAULT_HOST}`) };
    }
  },

  async () => {
    const network: NetworkInspectInfo = await dockerode.getNetwork("bridge").inspect();
    if (!network.IPAM || !network.IPAM.Config) {
      return {
        host: DEFAULT_HOST,
        callback: () => log.info(`Using default Docker host from within container: ${DEFAULT_HOST}`),
      };
    }

    const gateways = network.IPAM.Config.filter((config) => !!config.Gateway);
    if (gateways.length > 0) {
      const host = gateways[0].Gateway;
      return { host, callback: () => log.info(`Using Docker host from network gateway within container: ${host}`) };
    }
  },

  async () => {
    const host = await runInContainer("alpine:3.5", ["sh", "-c", "ip route|awk '/default/ { print $3 }'"]);
    return { host, callback: () => log.info(`Using Docker host from evaluated gateway within container: ${host}`) };
  },
];

const isInContainer = () => fs.existsSync("/.dockerenv");
