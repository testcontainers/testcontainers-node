import type Dockerode from "dockerode";
import { IntervalRetry, log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;

  withStartupTimeout(startupTimeoutMs: number): WaitStrategy;

  isStartupTimeoutSet(): boolean;

  getStartupTimeout(): number;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeoutMs = 60_000;
  private startupTimeoutSet = false;
  private abortOnContainerExit = true;

  public abstract waitUntilReady(
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startTime?: Date
  ): Promise<void>;

  public withStartupTimeout(startupTimeoutMs: number): this {
    this.startupTimeoutMs = startupTimeoutMs;
    this.startupTimeoutSet = true;
    return this;
  }

  public isStartupTimeoutSet(): boolean {
    return this.startupTimeoutSet;
  }

  public getStartupTimeout(): number {
    return this.startupTimeoutMs;
  }

  public withAbortOnContainerExit(abortOnContainerExit: boolean): this {
    this.abortOnContainerExit = abortOnContainerExit;
    return this;
  }

  protected async retryUntil<T>(
    container: Dockerode.Container,
    intervalMs: number,
    fn: () => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => Error
  ): Promise<T> {
    const result = await new IntervalRetry<T, Error>(intervalMs).retryUntil(
      async () => {
        try {
          return await fn();
        } catch (err) {
          await this.throwIfContainerExited(container);
          throw err;
        }
      },
      async (value) => {
        if (await predicate(value)) {
          return true;
        }
        await this.throwIfContainerExited(container);
        return false;
      },
      onTimeout,
      this.startupTimeoutMs
    );

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }

  protected async throwIfContainerExited(container: Dockerode.Container): Promise<void> {
    if (!this.abortOnContainerExit) {
      return;
    }

    const client = await getContainerRuntimeClient();
    const { State: state } = await client.container.inspect(container);

    if (state.Status === "exited") {
      const message = `Container exited with code ${state.ExitCode}`;
      log.error(message, { containerId: container.id });
      throw new Error(message);
    }
  }
}
