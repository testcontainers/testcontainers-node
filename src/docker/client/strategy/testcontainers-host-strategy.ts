import { getDockerClientConfig } from "../docker-client-config";
import Dockerode, { DockerOptions } from "dockerode";
import { sessionId } from "../../session-id";
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
    const dockerOptions: DockerOptions = { headers: { "x-tc-sid": sessionId } };

    const { hostname, port } = new URL(this.host);
    dockerOptions.host = hostname;
    dockerOptions.port = port;

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
