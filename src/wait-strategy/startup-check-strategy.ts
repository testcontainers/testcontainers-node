import { AbstractWaitStrategy, DEFAULT_STARTUP_TIMEOUT } from "./wait-strategy";
import Dockerode from "dockerode";
import { IntervalRetryStrategy } from "../retry-strategy";
import { dockerClient } from "../docker/docker-client";

export type StartupStatus = "PENDING" | "SUCCESS" | "FAIL";

export abstract class StartupCheckStrategy extends AbstractWaitStrategy {
  public abstract checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus>;

  public override async waitUntilReady(container: Dockerode.Container): Promise<void> {
    const { dockerode } = await dockerClient();
    const startupTimeout = this.startupTimeout ?? DEFAULT_STARTUP_TIMEOUT;

    const startupStatus = await new IntervalRetryStrategy<StartupStatus, Error>(1000).retryUntil(
      async () => await this.checkStartupState(dockerode, container.id),
      (startupStatus) => startupStatus === "SUCCESS" || startupStatus === "FAIL",
      () => new Error(`Container not accessible after ${startupTimeout}ms for ${container.id}`),
      startupTimeout
    );

    if (startupStatus instanceof Error) {
      throw startupStatus;
    } else if (startupStatus === "FAIL") {
      throw new Error(`Container failed to start for ${container.id}`);
    }
  }
}
