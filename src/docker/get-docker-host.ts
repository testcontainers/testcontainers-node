import { log } from "../logger";
import Dockerode, { NetworkInspectInfo } from "dockerode";
import { Host } from "./types";
import { runInContainer } from "./functions/run-in-container";
import fs from "fs";
import { URL } from "url";
import { promise as ping } from "ping";

const DEFAULT_HOST = "localhost";

export const getDockerHost = async (dockerode: Dockerode): Promise<Host> => {
  for (const [hostStrategyName, hostStrategy] of Object.entries(hostStrategies(dockerode))) {
    const result = await hostStrategy();

    if (result) {
      const hostname = result === DEFAULT_HOST ? DEFAULT_HOST : new URL(result).hostname;
      if (await isHostAvailable(hostname)) {
        log.info(`Docker host strategy ${hostStrategyName}: ${hostname}`);
        return hostname;
      } else {
        log.warn(`Docker host strategy ${hostStrategyName}: ${hostname} is not available`);
      }
    }
  }

  log.info(`Docker host strategy FALLBACK: ${DEFAULT_HOST}`);
  return DEFAULT_HOST;
};

const isHostAvailable = async (host: Host): Promise<boolean> => (await ping.probe(host, { timeout: 10_000 })).alive;

type HostStrategy = () => Promise<Host | undefined>;

const hostStrategies = (dockerode: Dockerode): { [hostStrategyName: string]: HostStrategy } => ({
  DOCKER_HOST: async () => {
    if (process.env.DOCKER_HOST) {
      return process.env.DOCKER_HOST;
    }
  },
  MODEM: async () => dockerode.modem.host,
  TESTCONTAINERS_HOST_OVERRIDE: async () => process.env["TESTCONTAINERS_HOST_OVERRIDE"],
  OUTSIDE_CONTAINER: async () => {
    if (!isInContainer()) {
      return DEFAULT_HOST;
    }
  },
  INSIDE_CONTAINER_NO_IPAM: async () => {
    const network: NetworkInspectInfo = await dockerode.getNetwork("bridge").inspect();
    if (!network.IPAM || !network.IPAM.Config) {
      return DEFAULT_HOST;
    }
  },
  INSIDE_CONTAINER_IPAM: async () => {
    const network: NetworkInspectInfo = await dockerode.getNetwork("bridge").inspect();
    if (network.IPAM && network.IPAM.Config) {
      const gateways = network.IPAM.Config.filter((config) => !!config.Gateway);
      if (gateways.length > 0) {
        return gateways[0].Gateway;
      }
    }
  },
  CONTAINER_GATEWAY: async () => runInContainer("alpine:3.5", ["sh", "-c", "ip route|awk '/default/ { print $3 }'"]),
});

const isInContainer = () => fs.existsSync("/.dockerenv");
