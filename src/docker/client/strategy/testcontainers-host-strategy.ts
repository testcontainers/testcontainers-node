import { getDockerClientConfig } from "../docker-client-config";
import Dockerode, { DockerOptions } from "dockerode";
import { URL } from "url";
import { DockerClientStrategyResult } from "../docker-client";
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

    // const dockerode = new Dockerode(dockerOptions);
    // dockerOptions.headers = { "x-tc-sid": await getSessionId(dockerode) };

    return {
      uri: this.host,
      dockerode: new Dockerode(dockerOptions),
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
