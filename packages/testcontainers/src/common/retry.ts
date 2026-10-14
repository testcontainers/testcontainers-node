import { setTimeout as sleep } from "node:timers/promises";

// setTimeout fires after 1ms when the delay exceeds this
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export type PollOptions<T> = {
  until?: (result: T) => boolean | Promise<boolean>;
  intervalMs: number;
  timeoutMs: number;
  timeoutMessage?: string;
  retryOnError?: boolean;
};

export async function poll<T>(
  fn: (context: { attempt: number; signal: AbortSignal }) => T | Promise<T>,
  options: PollOptions<T>
): Promise<T> {
  const {
    until,
    intervalMs,
    timeoutMs,
    timeoutMessage = `Timed out after ${timeoutMs}ms`,
    retryOnError = true,
  } = options;
  const controller = new AbortController();
  const { signal } = controller;
  let lastError: unknown;

  const attempts = async (): Promise<T> => {
    for (let attempt = 1; ; attempt++) {
      let outcome: { result: T } | undefined;
      try {
        outcome = { result: await fn({ attempt, signal }) };
        lastError = undefined;
      } catch (err) {
        if (!retryOnError) {
          throw err;
        }
        lastError = err;
      }

      if (outcome !== undefined && (until === undefined || (await until(outcome.result)))) {
        return outcome.result;
      }

      await sleep(intervalMs, undefined, { signal });
    }
  };

  return new Promise<T>((resolve, reject) => {
    const deadline = setTimeout(
      () => {
        const error = new Error(timeoutMessage, lastError === undefined ? {} : { cause: lastError });
        reject(error);
        controller.abort(error);
      },
      Math.min(timeoutMs, MAX_TIMEOUT_MS)
    );

    attempts()
      .then(resolve, reject)
      .finally(() => clearTimeout(deadline));
  });
}

/** @deprecated Use {@link poll} instead. */
export interface Retry<T, U> {
  retryUntil(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeoutMs: number
  ): Promise<T | U>;
}

/** @deprecated Use {@link poll} instead. */
export class IntervalRetry<T, U> implements Retry<T, U> {
  constructor(private readonly interval: number) {}

  public async retryUntil(
    fn: (attempt: number) => Promise<T>,
    predicate: (result: T) => boolean | Promise<boolean>,
    onTimeout: () => U,
    timeoutMs: number
  ): Promise<T | U> {
    const startTime = Date.now();

    let attemptNumber = 0;
    let result = await fn(attemptNumber++);

    while (!(await predicate(result))) {
      if (Date.now() - startTime > timeoutMs) {
        return onTimeout();
      }
      await sleep(this.interval);
      result = await fn(attemptNumber++);
    }

    return result;
  }
}
