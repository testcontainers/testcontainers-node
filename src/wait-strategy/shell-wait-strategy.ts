import Dockerode from "dockerode";
import { log } from "../logger";
import { AbstractWaitStrategy } from "./wait-strategy";
import { IntervalRetryStrategy } from "../retry-strategy";
import { execContainer } from "../docker/functions/container/exec-container";

export class ShellWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly command: string) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for successful shell command ${this.command} for ${container.id}`);

    await new IntervalRetryStrategy<number, Error>(100).retryUntil(
      async () => {
        const { exitCode } = await execContainer(
          container,
          ["/bin/sh", "-c", this.command],
          { stdin: true, detach: false, tty: true },
          false
        );
        return exitCode;
      },
      (exitCode) => exitCode === 0,
      () => {
        const timeout = this.startupTimeout;
        throw new Error(`Shell command not successful after ${timeout}ms for ${container.id}`);
      },
      this.startupTimeout
    );
  }
}
