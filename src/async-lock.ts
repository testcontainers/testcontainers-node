/**
 * An async lock enables one to programmatically chain async operations based on some key.
 */
export class AsyncLock {
  private ongoing: Map<string, Promise<unknown>>;

  constructor() {
    this.ongoing = new Map();
  }

  public async acquire<T>(key: string, callback: () => Promise<T>): Promise<T> {
    const ongoing = this.ongoing.get(key) ?? Promise.resolve();
    const updated = ongoing.then(() => {
      try {
        return callback();
      } finally {
        if (this.ongoing.get(key) === updated) {
          this.ongoing.delete(key);
        }
      }
    });

    this.ongoing.set(key, updated);
    return updated;
  }
}
