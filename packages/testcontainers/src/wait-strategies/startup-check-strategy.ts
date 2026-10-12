import type Dockerode from "dockerode";
import { poll } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { AbstractWaitStrategy } from "./wait-strategy";

export type StartupStatus = "PENDING" | "SUCCESS" | "FAIL";

export abstract class StartupCheckStrategy extends AbstractWaitStrategy {
  public abstract checkStartupState(
    dockerClient: Dockerode,
    containerId: string,
    signal?: AbortSignal
  ): Promise<StartupStatus>;

  public override async waitUntilReady(container: Dockerode.Container): Promise<void> {
    const client = await getContainerRuntimeClient();

    const startupStatus = await poll(
      ({ signal }) => this.checkStartupState(client.container.dockerode, container.id, signal),
      {
        until: (startupStatus) => startupStatus === "SUCCESS" || startupStatus === "FAIL",
        intervalMs: 1000,
        timeoutMs: this.startupTimeoutMs,
        timeoutMessage: `Container not accessible after ${this.startupTimeoutMs}ms`,
        retryOnError: false,
      }
    );

    if (startupStatus === "FAIL") {
      throw new Error(`Container failed to start for ${container.id}`);
    }
  }
}
