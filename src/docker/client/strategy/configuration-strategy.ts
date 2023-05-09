import { DockerClientConfig, getDockerClientConfig } from "../docker-client-config";
import Dockerode, { DockerOptions } from "dockerode";
import { sessionId } from "../../session-id";
import { URL } from "url";
import { promises as fs } from "fs";
import path from "path";
import { DockerClientInit } from "../docker-client";
import { DockerClientStrategy } from "./docker-client-strategy";

export class ConfigurationStrategy implements DockerClientStrategy {
  private dockerConfig!: DockerClientConfig;

  async init(): Promise<void> {
    this.dockerConfig = await getDockerClientConfig();
  }

  async getDockerClient(): Promise<DockerClientInit> {
    const { dockerHost, dockerTlsVerify, dockerCertPath } = this.dockerConfig;

    const dockerOptions: DockerOptions = { headers: { "x-tc-sid": sessionId } };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { pathname, hostname, port } = new URL(dockerHost!);
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      uri: dockerHost!,
      dockerode: new Dockerode(dockerOptions),
      composeEnvironment: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        DOCKER_HOST: dockerHost!,
        DOCKER_TLS_VERIFY: dockerTlsVerify,
        DOCKER_CERT_PATH: dockerCertPath,
      },
    };
  }

  isApplicable(): boolean {
    return this.dockerConfig.dockerHost !== undefined;
  }

  getName(): string {
    return "ConfigurationStrategy";
  }
}
