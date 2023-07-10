import { getDockerClientConfig } from "../docker-client-config";
import { DockerOptions } from "dockerode";
import { URL } from "url";
import { DockerClientStrategyResult } from "../docker-client-types";
import { DockerClientStrategy } from "./docker-client-strategy";

export class TestcontainersHostStrategy implements DockerClientStrategy {
  private host!: string;

  async init(): Promise<void> {
    const { tcHost } = await getDockerClientConfig();
    if (tcHost) {
      this.host = tcHost;
    }
  }

  async getDockerClient(): Promise<DockerClientStrategyResult> {
    const dockerOptions: DockerOptions = {};

    const { hostname, port } = new URL(this.host);
    dockerOptions.host = hostname;
    dockerOptions.port = port;

    return {
      uri: this.host,
      dockerOptions,
      composeEnvironment: {
        DOCKER_HOST: this.host,
      },
      allowUserOverrides: false,
    };
  }

  isApplicable(): boolean {
    return this.host !== undefined;
  }

  getName(): string {
    return "TestcontainersHostStrategy";
  }
}
