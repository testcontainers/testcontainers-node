import Dockerode, { NetworkInspectInfo } from "dockerode";
import * as dockerCompose from "docker-compose";
import { log } from "./logger";
import { Host } from "./docker-client-instance";
import fs from "fs";
import { runInContainer } from "./run-in-container";

type DockerComposeInfo = {
  version: string;
};

export interface DockerUtils {
  getHost(): Promise<Host>;
  logSystemDiagnostics(): Promise<void>;
}

export class DockerodeUtils implements DockerUtils {
  constructor(private readonly dockerode: Dockerode) {}

  public async getHost(): Promise<Host> {
    const modem = this.dockerode.modem;

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
        const network: NetworkInspectInfo = await this.dockerode.getNetwork("bridge").inspect();
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
            const host = await runInContainer(this.dockerode, "alpine:3.5", [
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

  private isInContainer() {
    return fs.existsSync("/.dockerenv");
  }

  public async logSystemDiagnostics(): Promise<void> {
    const info = {
      node: this.getNodeInfo(),
      docker: await this.getDockerInfo(),
      dockerCompose: await this.getDockerComposeInfo(),
    };

    log.debug(`System diagnostics: ${JSON.stringify(info, null, 2)}`);
  }

  private getNodeInfo() {
    return {
      version: process.version,
      architecture: process.arch,
      platform: process.platform,
    };
  }

  private async getDockerInfo() {
    const info = await this.dockerode.info();

    return {
      serverVersion: info.ServerVersion,
      operatingSystem: info.OperatingSystem,
      operatingSystemType: info.OSType,
      architecture: info.Architecture,
      cpus: info.NCPU,
      memory: info.MemTotal,
    };
  }

  private async getDockerComposeInfo(): Promise<DockerComposeInfo | undefined> {
    try {
      return {
        version: (await dockerCompose.version()).data.version,
      };
    } catch {
      log.warn("Unable to detect docker-compose version, is it installed?");
      return undefined;
    }
  }
}
