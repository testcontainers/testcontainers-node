import Dockerode from "dockerode";
import { AbstractWaitStrategy } from "./wait-strategy";
import { getContainerRuntimeClient } from "@testcontainers/container-runtime";
import { IntervalRetry, log } from "@testcontainers/common";

export class ShellWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly command: string) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    log.debug(`Waiting for successful shell command "${this.command}"...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();

    await new IntervalRetry<number, Error>(100).retryUntil(
      async () => {
        const { exitCode } = await client.container.exec(container, ["/bin/sh", "-c", this.command], {
          log: false,
        });
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

    log.debug(`Shell wait strategy complete`, { containerId: container.id });
  }
}
