import { isDefined } from "../type-guards";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import Dockerode from "dockerode";
import { DockerClientInit, DockerClientStrategy } from "./docker-client";

export class RootlessUnixSocketStrategy implements DockerClientStrategy {
  private applicable!: boolean;
  private socketPath: string | undefined;

  constructor(
    private readonly platform: NodeJS.Platform = process.platform,
    private readonly env: NodeJS.ProcessEnv = process.env
  ) {}

  async init(): Promise<void> {
    if (this.platform !== "linux" && this.platform !== "darwin") {
      this.applicable = false;
      return;
    }

    this.socketPath = [
      this.getSocketPathFromEnv(),
      this.getSocketPathFromHomeRunDir(),
      this.getSocketPathFromHomeDesktopDir(),
      this.getSocketPathFromRunDir(),
    ]
      .filter(isDefined)
      .find((candidateSocketPath) => existsSync(candidateSocketPath));

    this.applicable = this.socketPath !== undefined;
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

  async getDockerClient(): Promise<DockerClientInit> {
    return {
      uri: `unix://${this.socketPath}`,
      dockerode: new Dockerode({ socketPath: this.socketPath }),
      composeEnvironment: {},
    };
  }

  isApplicable(): boolean {
    return this.applicable;
  }

  getName(): string {
    return "RootlessUnixSocketStrategy";
  }
}
