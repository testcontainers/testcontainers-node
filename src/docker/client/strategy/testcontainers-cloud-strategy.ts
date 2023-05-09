import { getDockerClientConfig } from "../docker-client-config";
import Dockerode, { DockerOptions } from "dockerode";
import { sessionId } from "../../session-id";
import { URL } from "url";
import { DockerClientStrategyResult } from "../docker-client";
import { DockerClientStrategy } from "./docker-client-strategy";

export class TestcontainersCloudStrategy implements DockerClientStrategy {
  private testcontainersCloudHost!: string;

  async init(): Promise<void> {
    const { testcontainersCloudHost } = await getDockerClientConfig();
    if (testcontainersCloudHost) {
      this.testcontainersCloudHost = testcontainersCloudHost;
    }
  }

  async getDockerClient(): Promise<DockerClientStrategyResult> {
    const dockerOptions: DockerOptions = { headers: { "x-tc-sid": sessionId } };

    const { hostname, port } = new URL(this.testcontainersCloudHost);
    dockerOptions.host = hostname;
    dockerOptions.port = port;

    return {
      uri: this.testcontainersCloudHost,
      dockerode: new Dockerode(dockerOptions),
      composeEnvironment: {
        DOCKER_HOST: this.testcontainersCloudHost,
      },
      allowUserOverrides: false,
    };
  }

  isApplicable(): boolean {
    return this.testcontainersCloudHost !== undefined;
  }

  getName(): string {
    return "TestcontainersCloudStrategy";
  }
}
