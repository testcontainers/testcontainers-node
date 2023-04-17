import Dockerode from "dockerode";
import { log } from "../logger";
import { AbstractWaitStrategy, DEFAULT_STARTUP_TIMEOUT } from "./wait-strategy";
import { IntervalRetryStrategy } from "../retry-strategy";
import { execContainer } from "../docker/functions/container/exec-container";
import { dockerClient } from "../docker/docker-client";

export class ShellWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly command: string) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for successful shell command ${this.command} for ${container.id}`);

    const { dockerode, provider } = await dockerClient();
    const startupTimeout = this.startupTimeout ?? DEFAULT_STARTUP_TIMEOUT;

    await new IntervalRetryStrategy<number, Error>(100).retryUntil(
      async () => {
        const { exitCode } = await execContainer(
          dockerode,
          provider,
          container,
          ["/bin/sh", "-c", this.command],
          false
        );
        return exitCode;
      },
      (exitCode) => exitCode === 0,
      () => {
        throw new Error(`Shell command "${this.command}" not successful after ${startupTimeout}ms for ${container.id}`);
      },
      startupTimeout
    );
  }
}
