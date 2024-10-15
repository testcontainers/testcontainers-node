import Dockerode, { ContainerInspectInfo } from "dockerode";
import { StartupCheckStrategy, StartupStatus } from "./startup-check-strategy.ts";

export class OneShotStartupCheckStrategy extends StartupCheckStrategy {
  DOCKER_TIMESTAMP_ZERO = "0001-01-01T00:00:00Z";

  private isDockerTimestampNonEmpty(dockerTimestamp: string) {
    return dockerTimestamp !== "" && dockerTimestamp !== this.DOCKER_TIMESTAMP_ZERO && Date.parse(dockerTimestamp) > 0;
  }

  private isContainerStopped({ State: state }: ContainerInspectInfo): boolean {
    if (state.Running || state.Paused) {
      return false;
    }

    return this.isDockerTimestampNonEmpty(state.StartedAt) && this.isDockerTimestampNonEmpty(state.FinishedAt);
  }

  public async checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus> {
    const info = await dockerClient.getContainer(containerId).inspect();

    if (!this.isContainerStopped(info)) {
      return "PENDING";
    }

    if (info.State.ExitCode === 0) {
      return "SUCCESS";
    }

    return "FAIL";
  }
}
