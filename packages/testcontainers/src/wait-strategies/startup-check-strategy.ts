import Dockerode from "dockerode";
import { IntervalRetry, log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { AbstractWaitStrategy } from "./wait-strategy";

export type StartupStatus = "PENDING" | "SUCCESS" | "FAIL";

export abstract class StartupCheckStrategy extends AbstractWaitStrategy {
  constructor() {
    super();
  }

  public abstract checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus>;

  public override async waitUntilReady(container: Dockerode.Container): Promise<void> {
    const client = await getContainerRuntimeClient();

    const startupStatus = await new IntervalRetry<StartupStatus, Error>(1000).retryUntil(
      async () => await this.checkStartupState(client.container.dockerode, container.id),
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
