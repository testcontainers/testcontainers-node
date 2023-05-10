import { getDockerClientConfig } from "../docker-client-config";
import Dockerode, { DockerOptions } from "dockerode";
import { sessionId } from "../../session-id";
import { URL } from "url";
import { promises as fs } from "fs";
import path from "path";
import { DockerClientStrategyResult } from "../docker-client";
import { DockerClientStrategy } from "./docker-client-strategy";

export class ConfigurationStrategy implements DockerClientStrategy {
  private dockerHost!: string;
  private dockerTlsVerify: string | undefined;
  private dockerCertPath: string | undefined;

  async init(): Promise<void> {
    const { dockerHost, dockerTlsVerify, dockerCertPath } = await getDockerClientConfig();
    if (dockerHost) {
      this.dockerHost = dockerHost;
    }
    this.dockerTlsVerify = dockerTlsVerify;
    this.dockerCertPath = dockerCertPath;
  }

  async getDockerClient(): Promise<DockerClientStrategyResult> {
    const dockerOptions: DockerOptions = { headers: { "x-tc-sid": sessionId } };

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
      dockerode: new Dockerode(dockerOptions),
      composeEnvironment: {
        DOCKER_HOST: this.dockerHost,
        DOCKER_TLS_VERIFY: this.dockerTlsVerify,
        DOCKER_CERT_PATH: this.dockerCertPath,
      },
    };
  }

  isApplicable(): boolean {
    return this.dockerHost !== undefined;
  }

  getName(): string {
    return "ConfigurationStrategy";
  }
}
