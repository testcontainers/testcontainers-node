import { existsSync } from "fs";
import { DockerClientStrategyResult } from "../docker-client-types";
import { DockerClientStrategy } from "./docker-client-strategy";

export class UnixSocketStrategy implements DockerClientStrategy {
  async getDockerClient(): Promise<DockerClientStrategyResult> {
    return {
      uri: "unix:///var/run/docker.sock",
      dockerOptions: { socketPath: "/var/run/docker.sock" },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }

  isApplicable(): boolean {
    return (process.platform === "linux" || process.platform === "darwin") && existsSync("/var/run/docker.sock");
  }

  getName(): string {
    return "UnixSocketStrategy";
  }
}
