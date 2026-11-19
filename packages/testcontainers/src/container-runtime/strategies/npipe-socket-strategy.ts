import type { ContainerRuntimeClientStrategy } from "./strategy";
import type { ContainerRuntimeClientStrategyNotApplicable, ContainerRuntimeClientStrategyResult } from "./types";

export class NpipeSocketStrategy implements ContainerRuntimeClientStrategy {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  getName(): string {
    return "NpipeSocketStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | ContainerRuntimeClientStrategyNotApplicable> {
    if (this.platform !== "win32") {
      return { notApplicable: "only used on Windows" };
    }

    return {
      uri: "npipe:////./pipe/docker_engine",
      dockerOptions: { socketPath: "//./pipe/docker_engine" },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }
}
