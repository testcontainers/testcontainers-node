import { Duration, TemporalUnit } from "node-duration";

export interface RetryStrategy<T> {
    retry(fn: () => Promise<T | undefined>): Promise<T | undefined>;
}

abstract class AbstractRetryStrategy<T> implements RetryStrategy<T> {
    public abstract retry(fn: () => Promise<T | undefined>): Promise<T | undefined>;

    protected async wait(timeout: Duration) {
        await new Promise(resolve => setTimeout(resolve, timeout.get(TemporalUnit.MILLISECONDS)));
    }
}

export class SimpleRetryStrategy<T> extends AbstractRetryStrategy<T> {
    constructor(private readonly timeout: Duration) {
        super();
    }

    public async retry(fn: () => Promise<T | undefined>): Promise<T | undefined> {
        const result = await fn();

        if (result !== undefined) {
            return result;
        }

        await this.wait(this.timeout);

        return this.retry(fn);
    }
}
