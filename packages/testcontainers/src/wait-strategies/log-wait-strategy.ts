import Dockerode from "dockerode";
import { setTimeout } from "timers/promises";
import { log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";

export type Log = string;

export class LogWaitStrategy extends AbstractWaitStrategy {
  constructor(
    private readonly message: Log | RegExp,
    private readonly times: number,
  ) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    await Promise.race([this.handleTimeout(container.id), this.handleLogs(container, startTime)]);
  }

  async handleTimeout(containerId: string): Promise<void> {
    await setTimeout(this.startupTimeout);
    this.throwError(containerId, `Log message "${this.message}" not received after ${this.startupTimeout}ms`);
  }

  async handleLogs(container: Dockerode.Container, startTime?: Date): Promise<void> {
    log.debug(`Waiting for log message "${this.message}"...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();
    const stream = await client.container.logs(container, { since: startTime ? startTime.getTime() / 1000 : 0 });

    let matches = 0;
    for await (const chunk of stream) {
      if (this.matches(chunk)) {
        if (++matches === this.times) {
          return log.debug(`Log wait strategy complete`, { containerId: container.id });
        }
      }
    }

    this.throwError(container.id, `Log stream ended and message "${this.message}" was not received`);
  }

  matches(chunk: string): boolean {
    return this.message instanceof RegExp ? this.message.test(chunk) : chunk.includes(this.message);
  }

  throwError(containerId: string, message: string): void {
    log.error(message, { containerId });
    throw new Error(message);
  }
}