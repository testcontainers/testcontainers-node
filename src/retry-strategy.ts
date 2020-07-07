import { Duration, TemporalUnit } from "node-duration";
import { Clock, SystemClock, Time } from "./clock";

export interface RetryStrategy<T, U> {
  retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    onTimeout: () => U,
    timeout: Duration
  ): Promise<T | U>;
}

abstract class AbstractRetryStrategy<T, U> implements RetryStrategy<T, U> {
  protected constructor(protected readonly clock: Clock = new SystemClock()) {}

  public abstract retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    onTimeout: () => U,
    timeout: Duration
  ): Promise<T | U>;

  protected hasTimedOut(timeout: Duration, startTime: Time): boolean {
    return this.clock.getTime() - startTime > timeout.get(TemporalUnit.MILLISECONDS);
  }

  protected wait(duration: Duration): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, duration.get(TemporalUnit.MILLISECONDS)));
  }
}

export class IntervalRetryStrategy<T, U> extends AbstractRetryStrategy<T, U> {
  constructor(private readonly interval: Duration) {
    super();
  }

  public async retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    onTimeout: () => U,
    timeout: Duration
  ): Promise<T | U> {
    const startTime = this.clock.getTime();

    let result = await fn();

    while (!predicate(result)) {
      if (this.hasTimedOut(timeout, startTime)) {
        return onTimeout();
      }
      await this.wait(this.interval);
      result = await fn();
    }

    return result;
  }
}
