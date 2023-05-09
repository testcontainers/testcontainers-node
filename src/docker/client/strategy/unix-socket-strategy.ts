import Dockerode from "dockerode";
import { existsSync } from "fs";
import { DockerClientInit } from "../docker-client";
import { DockerClientStrategy } from "./docker-client-strategy";

export class UnixSocketStrategy implements DockerClientStrategy {
  async getDockerClient(): Promise<DockerClientInit> {
    return {
      uri: "unix:///var/run/docker.sock",
      dockerode: new Dockerode({ socketPath: "/var/run/docker.sock" }),
      composeEnvironment: {},
    };
  }

  isApplicable(): boolean {
    return (process.platform === "linux" || process.platform === "darwin") && existsSync("/var/run/docker.sock");
  }

  getName(): string {
    return "UnixSocketStrategy";
  }
}
