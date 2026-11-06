import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDefined } from "../../common";
import type { ContainerRuntimeClientStrategy } from "./strategy";
import type { ContainerRuntimeClientStrategyNotApplicable, ContainerRuntimeClientStrategyResult } from "./types";

export class RootlessUnixSocketStrategy implements ContainerRuntimeClientStrategy {
  constructor(
    private readonly platform: NodeJS.Platform = process.platform,
    private readonly env: NodeJS.ProcessEnv = process.env
  ) {}

  getName(): string {
    return "RootlessUnixSocketStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | ContainerRuntimeClientStrategyNotApplicable> {
    if (this.platform !== "linux" && this.platform !== "darwin") {
      return { notApplicable: "only used on Linux and macOS" };
    }

    const candidateSocketPaths = [
      this.getSocketPathFromEnv(),
      this.getSocketPathFromHomeRunDir(),
      this.getSocketPathFromHomeDesktopDir(),
      this.getSocketPathFromRunDir(),
    ].filter(isDefined);
    const socketPath = candidateSocketPaths.find((candidateSocketPath) => existsSync(candidateSocketPath));

    if (!socketPath) {
      return { notApplicable: `no socket found at ${candidateSocketPaths.join(", ")}` };
    }

    return {
      uri: `unix://${socketPath}`,
      dockerOptions: { socketPath },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }

  private getSocketPathFromEnv(): string | undefined {
    const xdgRuntimeDir = this.env.XDG_RUNTIME_DIR;

    if (xdgRuntimeDir !== undefined) {
      return path.join(xdgRuntimeDir, "docker.sock");
    }
    return undefined;
  }

  private getSocketPathFromHomeRunDir(): string {
    return path.join(os.homedir(), ".docker", "run", "docker.sock");
  }

  private getSocketPathFromHomeDesktopDir(): string {
    return path.join(os.homedir(), ".docker", "desktop", "docker.sock");
  }

  private getSocketPathFromRunDir(): string {
    return path.join("/run", "user", `${os.userInfo().uid}`, "docker.sock");
  }
}
