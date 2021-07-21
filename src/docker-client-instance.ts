import fs from "fs";
import Dockerode, { NetworkInspectInfo } from "dockerode";
import * as dockerCompose from "docker-compose";
import { Command, DockerClient, DockerodeClient } from "./docker-client";
import { log } from "./logger";
import { RandomUuid } from "./uuid";

export type Host = string;

type DockerComposeInfo = {
  version: string;
};

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
    const nodeInfo = {
      version: process.version,
      architecture: process.arch,
      platform: process.platform,
    };

    const dockerInfo = await dockerClient.getInfo();
    const dockerComposeInfo = await this.getDockerComposeInfo();

    const info = {
      node: nodeInfo,
      docker: dockerInfo,
      dockerCompose: dockerComposeInfo,
    };

    log.debug(`System diagnostics: ${JSON.stringify(info, null, 2)}`);
  }

  private static async getDockerComposeInfo(): Promise<DockerComposeInfo | undefined> {
    try {
      return {
        version: (await dockerCompose.version()).data.version,
      };
    } catch {
      log.warn("Unable to detect docker-compose version, is it installed?");
      return undefined;
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
      if (process.env["TESTCONTAINERS_HOST_OVERRIDE"]) {
        const host = process.env["TESTCONTAINERS_HOST_OVERRIDE"];
        log.info(`Using TESTCONTAINERS_HOST_OVERRIDE: ${host}, socket path: ${socketPath}`);
        return host;
      } else if (!this.isInContainer()) {
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
            const host = await this.runInContainer(dockerode, "alpine:3.5", [
              "sh",
              "-c",
              "ip route|awk '/default/ { print $3 }'",
            ]);
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
  }

  private static async runInContainer(
    dockerode: Dockerode,
    image: string,
    command: Command[]
  ): Promise<string | undefined> {
    try {
      const container = await dockerode.createContainer({ Image: image, Cmd: command });
      const stream = await container.attach({ stream: true, stdout: true, stderr: true });

      const chunks: string[] = [];
      const promise = new Promise<void>((resolve, reject) => {
        stream.on("end", () => resolve());

        const outStream = {
          write: (chunk: string) => {
            const chunkStr = Buffer.from(chunk).toString().trim();
            chunks.push(chunkStr);
          },
        };

        const errStream = {
          write: (chunk: string) => {
            const chunkStr = Buffer.from(chunk).toString().trim();
            reject(`Error: ${chunkStr}`);
          },
        };

        container.modem.demuxStream(stream, outStream, errStream);
      });

      await container.start();

      await promise;

      return chunks.join("");
    } catch (err) {
      log.error(`Failed to do smth: ${err}`);
      return undefined;
    }
  }

  private static isInContainer() {
    return fs.existsSync("/.dockerenv");
  }
}
