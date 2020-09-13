import fs from "fs";
import Dockerode, { NetworkInspectInfo } from "dockerode";
import { DockerClient, DockerodeClient } from "./docker-client";
import log from "./logger";
import { RandomUuid } from "./uuid";

export type Host = string;

export class DockerClientFactory {
  private static client?: DockerClient;

  public static async getClient(): Promise<DockerClient> {
    if (this.client) {
      return this.client;
    } else {
      const dockerode = new Dockerode();
      const host = await this.getHost(dockerode);
      this.client = new DockerodeClient(host, dockerode, new RandomUuid().nextUuid());
      return this.client;
    }
  }

  private static async getHost(dockerode: Dockerode): Promise<Host> {
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
      if (!fs.existsSync("/.dockerenv")) {
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
            const host = "localhost";
            log.info(`Using Docker host from gateway with IPAM without gateway: ${host}, socket path: ${socketPath}`);
            return host;
          }
        }
      }
    }
  }
}
