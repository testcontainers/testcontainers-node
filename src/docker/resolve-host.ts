import Dockerode, { NetworkInspectInfo } from "dockerode";
import { URL } from "url";
import { log } from "../logger";
import { runInContainer } from "./functions/run-in-container";
import { existsSync } from "fs";
import { ContainerRuntime } from "./types";

export const resolveHost = async (
  dockerode: Dockerode,
  containerRuntime: ContainerRuntime,
  indexServerAddress: string,
  uri: string,
  allowUserOverrides: boolean,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> => {
  if (allowUserOverrides) {
    if (env.TESTCONTAINERS_HOST_OVERRIDE !== undefined) {
      return env.TESTCONTAINERS_HOST_OVERRIDE;
    }
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
        const networkName = containerRuntime === "podman" ? "podman" : "bridge";
        const gateway = await findGateway(dockerode, networkName);
        if (gateway !== undefined) {
          return gateway;
        }
        const defaultGateway = await findDefaultGateway(dockerode, indexServerAddress);
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

const findGateway = async (dockerode: Dockerode, networkName: string): Promise<string | undefined> => {
  log.debug(`Checking gateway for Docker host...`);
  const inspectResult: NetworkInspectInfo = await dockerode.getNetwork(networkName).inspect();
  return inspectResult?.IPAM?.Config?.find((config) => config.Gateway !== undefined)?.Gateway;
};

const findDefaultGateway = async (dockerode: Dockerode, indexServerAddress: string): Promise<string | undefined> => {
  log.debug(`Checking default gateway for Docker host...`);
  return runInContainer(dockerode, indexServerAddress, "alpine:3.14", [
    "sh",
    "-c",
    "ip route|awk '/default/ { print $3 }'",
  ]);
};

const isInContainer = () => existsSync("/.dockerenv");
