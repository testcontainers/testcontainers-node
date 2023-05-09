import { AbstractWaitStrategy } from "./wait-strategy";
import Dockerode from "dockerode";
import { IntervalRetryStrategy } from "../retry-strategy";
import { getDockerClient } from "../docker/client/docker-client";
import { log } from "../logger";

export type StartupStatus = "PENDING" | "SUCCESS" | "FAIL";

export abstract class StartupCheckStrategy extends AbstractWaitStrategy {
  public abstract checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus>;

  public override async waitUntilReady(container: Dockerode.Container): Promise<void> {
    const { dockerode } = await getDockerClient();
    const startupStatus = await new IntervalRetryStrategy<StartupStatus, Error>(1000).retryUntil(
      async () => await this.checkStartupState(dockerode, container.id),
      (startupStatus) => startupStatus === "SUCCESS" || startupStatus === "FAIL",
      () => {
        const message = `Container not accessible after ${this.startupTimeout}ms`;
        log.error(message, { containerId: container.id });
        return new Error(message);
      },
      this.startupTimeout
    );

    if (startupStatus instanceof Error) {
      throw startupStatus;
    } else if (startupStatus === "FAIL") {
      throw new Error(`Container failed to start for ${container.id}`);
    }
  }
}
