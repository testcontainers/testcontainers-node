import byline from "byline";
import Dockerode from "dockerode";
import { setTimeout } from "timers/promises";
import { log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";

export type Log = string;

export class LogWaitStrategy extends AbstractWaitStrategy {
  private abortController!: AbortController;

  constructor(
    private readonly message: Log | RegExp,
    private readonly times: number
  ) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    this.abortController = new AbortController();
    await Promise.race([this.handleTimeout(container.id), this.handleLogs(container, startTime)]);
  }

  async handleTimeout(containerId: string): Promise<void> {
    try {
      await setTimeout(this.startupTimeout, undefined, { signal: this.abortController.signal });
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        throw err;
      }
    }
    this.throwError(containerId, `Log message "${this.message}" not received after ${this.startupTimeout}ms`);
    this.abortController.abort();
  }

  async handleLogs(container: Dockerode.Container, startTime?: Date): Promise<void> {
    log.debug(`Waiting for log message "${this.message}"...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();
    const stream = await client.container.logs(container, { since: startTime ? startTime.getTime() / 1000 : 0 });

    let matches = 0;
    for await (const line of byline(stream)) {
      if (this.abortController.signal.aborted) {
        break;
      }
      if (this.matches(line)) {
        if (++matches === this.times) {
          log.debug(`Log wait strategy complete`, { containerId: container.id });
          this.abortController.abort();
          return;
        }
      }
    }

    this.throwError(container.id, `Log stream ended and message "${this.message}" was not received`);
  }

  private matches(line: string): boolean {
    return this.message instanceof RegExp ? this.message.test(line) : line.includes(this.message);
  }

  private throwError(containerId: string, message: string): void {
    log.error(message, { containerId });
    throw new Error(message);
  }
}
