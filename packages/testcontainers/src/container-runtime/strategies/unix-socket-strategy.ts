import { existsSync } from "node:fs";
import type { ContainerRuntimeClientStrategy } from "./strategy";
import type { ContainerRuntimeClientStrategyNotApplicable, ContainerRuntimeClientStrategyResult } from "./types";

export class UnixSocketStrategy implements ContainerRuntimeClientStrategy {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  getName(): string {
    return "UnixSocketStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | ContainerRuntimeClientStrategyNotApplicable> {
    if (this.platform !== "linux" && this.platform !== "darwin") {
      return { notApplicable: "only used on Linux and macOS" };
    }
    if (!existsSync("/var/run/docker.sock")) {
      return { notApplicable: "/var/run/docker.sock does not exist" };
    }

    return {
      uri: "unix:///var/run/docker.sock",
      dockerOptions: { socketPath: "/var/run/docker.sock" },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }
}
