import { DockerOptions } from "dockerode";
import fs from "fs/promises";
import path from "path";
import { URL } from "url";
import { ContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";
import { getContainerRuntimeConfig } from "./utils/config";

export class ConfigurationStrategy implements ContainerRuntimeClientStrategy {
  getName(): string {
    return "ConfigurationStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined> {
    const { dockerHost, dockerTlsVerify, dockerCertPath } = await getContainerRuntimeConfig();

    if (!dockerHost) {
      return undefined;
    }

    const dockerOptions: DockerOptions = {};

    const { pathname, hostname, port } = new URL(dockerHost);
    if (hostname !== "") {
      dockerOptions.host = hostname;
      dockerOptions.port = port;
    } else {
      dockerOptions.socketPath = pathname;
    }

    if (dockerTlsVerify === "1" && dockerCertPath !== undefined) {
      dockerOptions.ca = await fs.readFile(path.resolve(dockerCertPath, "ca.pem"));
      dockerOptions.cert = await fs.readFile(path.resolve(dockerCertPath, "cert.pem"));
      dockerOptions.key = await fs.readFile(path.resolve(dockerCertPath, "key.pem"));
    }

    return {
      uri: dockerHost,
      dockerOptions,
      composeEnvironment: {
        DOCKER_HOST: dockerHost,
        DOCKER_TLS_VERIFY: dockerTlsVerify,
        DOCKER_CERT_PATH: dockerCertPath,
      },
      allowUserOverrides: true,
    };
  }
}
