export interface RetryStrategy<T> {
    retry(fn: () => Promise<T>, predicate: (result: T) => boolean): Promise<T>;
}
