import { DockerClientStrategyResult } from "../docker-client-types";
import { DockerClientStrategy } from "./docker-client-strategy";

export class NpipeSocketStrategy implements DockerClientStrategy {
  async getDockerClient(): Promise<DockerClientStrategyResult> {
    return {
      uri: "npipe:////./pipe/docker_engine",
      dockerOptions: { socketPath: "//./pipe/docker_engine" },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }

  isApplicable(): boolean {
    return process.platform === "win32";
  }

  getName(): string {
    return "NpipeSocketStrategy";
  }
}
