import { Duration } from "node-duration";
import { Clock, Time } from "./clock";
export interface RetryStrategy<T, U> {
    retryUntil(fn: () => Promise<T>, predicate: (result: T) => boolean, onTimeout: () => U, timeout: Duration): Promise<T | U>;
}
declare abstract class AbstractRetryStrategy<T, U> implements RetryStrategy<T, U> {
    protected readonly clock: Clock;
    protected constructor(clock?: Clock);
    abstract retryUntil(fn: () => Promise<T>, predicate: (result: T) => boolean, onTimeout: () => U, timeout: Duration): Promise<T | U>;
    protected hasTimedOut(timeout: Duration, startTime: Time): boolean;
    protected wait(duration: Duration): Promise<void>;
}
export declare class IntervalRetryStrategy<T, U> extends AbstractRetryStrategy<T, U> {
    private readonly interval;
    constructor(interval: Duration);
    retryUntil(fn: () => Promise<T>, predicate: (result: T) => boolean, onTimeout: () => U, timeout: Duration): Promise<T | U>;
}
export {};
