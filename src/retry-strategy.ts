import { Duration, TemporalUnit } from "node-duration";

export interface RetryStrategy<T> {
    retry(fn: () => Promise<T>, predicate: (result: T) => boolean): Promise<T>;
}

abstract class AbstractRetryStrategy<T> implements RetryStrategy<T> {
    public abstract retry(fn: () => Promise<T>, predicate: (result: T) => boolean): Promise<T>;

    protected async wait(timeout: Duration) {
        await new Promise(resolve => setTimeout(resolve, timeout.get(TemporalUnit.MILLISECONDS)));
    }
}
