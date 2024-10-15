import { getContainerRuntimeConfig } from "./utils/config.ts";
import { DockerOptions } from "dockerode";
import { URL } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { ContainerRuntimeClientStrategyResult } from "./types.ts";
import { ContainerRuntimeClientStrategy } from "./strategy.ts";

export class ConfigurationStrategy implements ContainerRuntimeClientStrategy {
  private dockerHost!: string;
  private dockerTlsVerify: string | undefined;
  private dockerCertPath: string | undefined;

  getName(): string {
    return "ConfigurationStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined> {
    const { dockerHost, dockerTlsVerify, dockerCertPath } = await getContainerRuntimeConfig();

    if (!dockerHost) {
      return undefined;
    }

    this.dockerHost = dockerHost;
    this.dockerTlsVerify = dockerTlsVerify;
    this.dockerCertPath = dockerCertPath;

    const dockerOptions: DockerOptions = {};

    const { pathname, hostname, port } = new URL(this.dockerHost);
    if (hostname !== "") {
      dockerOptions.host = hostname;
      dockerOptions.port = port;
    } else {
      dockerOptions.socketPath = pathname;
    }

    if (this.dockerTlsVerify === "1" && this.dockerCertPath !== undefined) {
      dockerOptions.ca = await fs.readFile(path.resolve(this.dockerCertPath, "ca.pem"));
      dockerOptions.cert = await fs.readFile(path.resolve(this.dockerCertPath, "cert.pem"));
      dockerOptions.key = await fs.readFile(path.resolve(this.dockerCertPath, "key.pem"));
    }

    return {
      uri: this.dockerHost,
      dockerOptions,
      composeEnvironment: {
        DOCKER_HOST: this.dockerHost,
        DOCKER_TLS_VERIFY: this.dockerTlsVerify,
        DOCKER_CERT_PATH: this.dockerCertPath,
      },
      allowUserOverrides: true,
    };
  }
}
