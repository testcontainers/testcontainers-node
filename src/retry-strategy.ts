import { Clock, SystemClock, Time } from "./clock";

export interface RetryStrategy<T, U> {
  retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeout: number
  ): Promise<T | U>;
}

abstract class AbstractRetryStrategy<T, U> implements RetryStrategy<T, U> {
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

export class IntervalRetryStrategy<T, U> extends AbstractRetryStrategy<T, U> {
  constructor(private readonly interval: number) {
    super();
  }

  public async retryUntil(
    fn: (attempt: number) => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeout: number
  ): Promise<T | U> {
    let timedOut = false;
    const timeoutPromise = new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        timedOut = true;
        reject();
      }, timeout).unref()
    );

    let result;
    let attemptNumber = 0;

    // eslint-disable-next-line no-constant-condition
    while (!timedOut) {
      try {
        result = await Promise.race<T>([fn(attemptNumber++), timeoutPromise]);
        if (await predicate(result)) {
          break;
        }
      } catch {}

      await this.wait(this.interval);
    }

    if (!result) {
      return onTimeout();
    } else {
      return result;
    }
  }
}
