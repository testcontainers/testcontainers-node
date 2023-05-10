import Dockerode from "dockerode";
import { DockerClientStrategyResult } from "../docker-client";
import { DockerClientStrategy } from "./docker-client-strategy";

export class NpipeSocketStrategy implements DockerClientStrategy {
  async getDockerClient(): Promise<DockerClientStrategyResult> {
    return {
      uri: "npipe:////./pipe/docker_engine",
      dockerode: new Dockerode({ socketPath: "//./pipe/docker_engine" }),
      composeEnvironment: {},
    };
  }

  isApplicable(): boolean {
    return process.platform === "win32";
  }

  getName(): string {
    return "NpipeSocketStrategy";
  }
}
