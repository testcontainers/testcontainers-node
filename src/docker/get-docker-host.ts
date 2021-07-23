import { log } from "../logger";
import { NetworkInspectInfo } from "dockerode";
import { Host } from "./types";
import { runInContainer } from "./functions/run-in-container";
import fs from "fs";
import { dockerode } from "./dockerode";

export const getDockerHost = async (): Promise<Host> => {
  const modem = dockerode.modem;

  if (process.env.DOCKER_HOST) {
    log.info(`Detected DOCKER_HOST environment variable: ${process.env.DOCKER_HOST}`);
  }

  if (modem.host) {
    const host = modem.host;
    log.info(`Using Docker host from modem: ${host}`);
    return host;
  } else {
    const socketPath = modem.socketPath;
    if (process.env["TESTCONTAINERS_HOST_OVERRIDE"]) {
      const host = process.env["TESTCONTAINERS_HOST_OVERRIDE"];
      log.info(`Using TESTCONTAINERS_HOST_OVERRIDE: ${host}, socket path: ${socketPath}`);
      return host;
    } else if (!isInContainer()) {
      const host = "localhost";
      log.info(`Using default Docker host: ${host}, socket path: ${socketPath}`);
      return host;
    } else {
      const network: NetworkInspectInfo = await dockerode.getNetwork("bridge").inspect();
      if (!network.IPAM || !network.IPAM.Config) {
        const host = "localhost";
        log.info(`Using Docker host from gateway without IPAM: ${host}, socket path: ${socketPath}`);
        return host;
      } else {
        const gateways = network.IPAM.Config.filter((config) => !!config.Gateway);
        if (gateways.length > 0) {
          const host = gateways[0].Gateway;
          log.info(`Using Docker host from gateway with IPAM: ${host}, socket path: ${socketPath}`);
          return host;
        } else {
          log.debug("Starting container in attempt to query gateway");
          const host = await runInContainer("alpine:3.5", ["sh", "-c", "ip route|awk '/default/ { print $3 }'"]);
          if (host) {
            log.info(`Using Docker host from gateway with IPAM with gateway: ${host}, socket path: ${socketPath}`);
            return host;
          } else {
            const host = "localhost";
            log.info(`Using Docker host from gateway with IPAM without gateway: ${host}, socket path: ${socketPath}`);
            return host;
          }
        }
      }
    }
  }
};

const isInContainer = () => fs.existsSync("/.dockerenv");
