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

  for (const [hostStrategyName, hostStrategy] of Object.entries(hostStrategies(dockerode))) {
    const result = await hostStrategy();

    if (result) {
      log.info(`Docker host strategy ${hostStrategyName}: ${result}`);
      return result;
    }
  }

  log.info(`Docker host strategy FALLBACK: ${DEFAULT_HOST}`);
  return DEFAULT_HOST;
};

type HostStrategy = () => Promise<Host | undefined>;

const hostStrategies = (dockerode: Dockerode): { [hostStrategyName: string]: HostStrategy } => ({
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
