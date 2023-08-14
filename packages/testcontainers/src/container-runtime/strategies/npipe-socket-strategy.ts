import { ContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";

export class NpipeSocketStrategy implements ContainerRuntimeClientStrategy {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  getName(): string {
    return "NpipeSocketStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined> {
    if (this.platform !== "win32") {
      return;
    }

    return {
      uri: "npipe:////./pipe/docker_engine",
      dockerOptions: { socketPath: "//./pipe/docker_engine" },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }
}
