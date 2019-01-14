import { Duration } from "node-duration";
export interface RetryStrategy<T> {
    retry(fn: () => Promise<T | undefined>): Promise<T | undefined>;
}
declare abstract class AbstractRetryStrategy<T> implements RetryStrategy<T> {
    abstract retry(fn: () => Promise<T | undefined>): Promise<T | undefined>;
    protected wait(timeout: Duration): Promise<void>;
}
export declare class SimpleRetryStrategy<T> extends AbstractRetryStrategy<T> {
    private readonly timeout;
    constructor(timeout: Duration);
    retry(fn: () => Promise<T | undefined>): Promise<T | undefined>;
}
export {};
