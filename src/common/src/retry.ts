import { Clock, SystemClock, Time } from "./clock";

export interface Retry<T, U> {
  retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeout: number
  ): Promise<T | U>;
}

abstract class AbstractRetry<T, U> implements Retry<T, U> {
  protected constructor(protected readonly clock: Clock = new SystemClock()) {}

  public abstract retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeout: number
  ): Promise<T | U>;

  protected hasTimedOut(timeout: number, startTime: Time): boolean {
    return this.clock.getTime() - startTime > timeout;
  }

  protected wait(duration: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }
}

export class IntervalRetry<T, U> extends AbstractRetry<T, U> {
  constructor(private readonly interval: number) {
    super();
  }

  public async retryUntil(
    fn: (attempt: number) => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeout: number
  ): Promise<T | U> {
    const startTime = this.clock.getTime();

    let attemptNumber = 0;
    let result = await fn(attemptNumber++);

    while (!(await predicate(result))) {
      if (this.hasTimedOut(timeout, startTime)) {
        return onTimeout();
      }
      await this.wait(this.interval);
      result = await fn(attemptNumber++);
    }

    return result;
  }
}
