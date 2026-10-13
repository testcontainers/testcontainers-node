import type Dockerode from "dockerode";
import { log, poll } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";

export class ShellWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly command: string) {
    super();
  }

  public async waitUntilReady(
    container: Dockerode.Container,
    _boundPorts?: BoundPorts,
    _startTime?: Date,
    startupSignal?: AbortSignal
  ): Promise<void> {
    log.debug(`Waiting for successful shell command "${this.command}"...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();

    await poll(
      async ({ signal }) => {
        const { exitCode } = await client.container.exec(container, ["/bin/sh", "-c", this.command], {
          log: false,
          signal,
        });
        return exitCode;
      },
      {
        until: (exitCode) => exitCode === 0,
        intervalMs: 100,
        timeoutMs: this.startupTimeoutMs,
        timeoutMessage: `Shell command "${this.command}" not successful after ${this.startupTimeoutMs}ms`,
        retryOnError: false,
        signal: startupSignal,
      }
    );

    log.debug(`Shell wait strategy complete`, { containerId: container.id });
  }
}
