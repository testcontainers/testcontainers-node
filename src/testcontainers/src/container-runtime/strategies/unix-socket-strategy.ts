import { existsSync } from "fs";
import { ContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";

export class UnixSocketStrategy implements ContainerRuntimeClientStrategy {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  getName(): string {
    return "UnixSocketStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined> {
    if ((this.platform !== "linux" && this.platform !== "darwin") || !existsSync("/var/run/docker.sock")) {
      return;
    }

    return {
      uri: "unix:///var/run/docker.sock",
      dockerOptions: { socketPath: "/var/run/docker.sock" },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }
}
