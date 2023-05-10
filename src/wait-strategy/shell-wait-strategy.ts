import Dockerode from "dockerode";
import { log } from "../logger";
import { AbstractWaitStrategy } from "./wait-strategy";
import { IntervalRetryStrategy } from "../retry-strategy";
import { execContainer } from "../docker/functions/container/exec-container";
import { getDockerClient } from "../docker/client/docker-client";

export class ShellWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly command: string) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for successful shell command "${this.command}"...`, { containerId: container.id });

    const { dockerode, containerRuntime } = await getDockerClient();
    await new IntervalRetryStrategy<number, Error>(100).retryUntil(
      async () => {
        const { exitCode } = await execContainer(
          dockerode,
          containerRuntime,
          container,
          ["/bin/sh", "-c", this.command],
          false
        );
        return exitCode;
      },
      (exitCode) => exitCode === 0,
      () => {
        const message = `Shell command "${this.command}" not successful after ${this.startupTimeout}ms`;
        log.error(message, { containerId: container.id });
        throw new Error(message);
      },
      this.startupTimeout
    );
  }
}
