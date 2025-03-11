import { existsSync } from "fs";
import os from "os";
import path from "path";
import { isDefined } from "../../common";
import { ContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";

export class RootlessUnixSocketStrategy implements ContainerRuntimeClientStrategy {
  constructor(
    private readonly platform: NodeJS.Platform = process.platform,
    private readonly env: NodeJS.ProcessEnv = process.env
  ) {}

  getName(): string {
    return "RootlessUnixSocketStrategy";
  }

  async getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined> {
    if (this.platform !== "linux" && this.platform !== "darwin") {
      return;
    }

    const socketPath = [
      this.getSocketPathFromEnv(),
      this.getSocketPathFromHomeRunDir(),
      this.getSocketPathFromHomeDesktopDir(),
      this.getSocketPathFromRunDir(),
    ]
      .filter(isDefined)
      .find((candidateSocketPath) => existsSync(candidateSocketPath));

    if (!socketPath) {
      return;
    }

    return {
      uri: `unix://${socketPath}`,
      dockerOptions: { socketPath },
      composeEnvironment: {},
      allowUserOverrides: true,
    };
  }

  private getSocketPathFromEnv(): string | undefined {
    const xdgRuntimeDir = this.env["XDG_RUNTIME_DIR"];

    if (xdgRuntimeDir !== undefined) {
      return path.join(xdgRuntimeDir, "docker.sock");
    } else {
      return undefined;
    }
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
