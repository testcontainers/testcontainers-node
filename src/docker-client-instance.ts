import fs from "fs";
import Dockerode, { NetworkInspectInfo } from "dockerode";
import { DockerClient, DockerodeClient } from "./docker-client";
import { log } from "./logger";
import { RandomUuid } from "./uuid";

export type Host = string;

export class DockerClientInstance {
  private static instance: Promise<DockerClient>;

  public static async getInstance(): Promise<DockerClient> {
    if (!this.instance) {
      this.instance = this.createInstance();
    }
    return this.instance;
  }

  private static async createInstance(): Promise<DockerClient> {
    log.debug("Creating new DockerClient");
    const dockerode = new Dockerode();
    const host = await this.getHost(dockerode);

    const dockerClient = new DockerodeClient(host, dockerode, new RandomUuid().nextUuid());
    await this.logSystemDiagnostics(dockerClient);

    return dockerClient;
  }

  private static async logSystemDiagnostics(dockerClient: DockerodeClient) {
    const nodeInfo = {version: process.version, architecture: process.arch, platform: process.platform};
    const dockerInfo = await dockerClient.getInfo();
    log.debug(`System check: ${JSON.stringify({node: nodeInfo, docker: dockerInfo}, null, 2)}`);
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
      if (process.env["TESTCONTAINERS_HOST_OVERRIDE"]) {
        const host = process.env["TESTCONTAINERS_HOST_OVERRIDE"];
        log.info(`Using TESTCONTAINERS_HOST_OVERRIDE: ${host}, socket path: ${socketPath}`);
        return host;
      } else if (!fs.existsSync("/.dockerenv")) {
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
