import { AsyncLock } from "./async-lock";

describe("AsyncLock", () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  it("should properly queue under same key", async () => {
    const results: number[] = [];
    const lock = new AsyncLock();

    await Promise.all([
      lock.acquire("test", async () => results.push(1)),
      lock.acquire("test", async () => results.push(2)),
      lock.acquire("test", async () => results.push(3)),
      lock.acquire("test", async () => results.push(4)),
    ]);

    expect(results).toEqual([1, 2, 3, 4]);
  });

  it("should not block different keys", async () => {
    let counter = 0;
    const lock = new AsyncLock();

    const done = Promise.all([
      lock.acquire("foo", async () => {
        counter++;
        await sleep(500);
        counter--;
      }),
      lock.acquire("bar", async () => {
        counter++;
        await sleep(500);
        counter--;
      }),
    ]);

    await sleep(100);

    // Both processes are running
    expect(counter).toEqual(2);
    await done;

    // Both are finished
    expect(counter).toEqual(0);
  });

  it("should manage multiple mixed queues", async () => {
    const foo: number[] = [];
    const bar: number[] = [];
    const lock = new AsyncLock();

    await Promise.all([
      lock.acquire("foo", async () => {
        await sleep(250);
        foo.push(1);
      }),
      lock.acquire("bar", async () => {
        await sleep(200);
        bar.push(2);
      }),
      lock.acquire("bar", async () => bar.push(3)),
      lock.acquire("foo", async () => foo.push(4)),
    ]);

    expect(foo).toEqual([1, 4]);
    expect(bar).toEqual([2, 3]);
  });

  it("should keep promise rejections isolated and continue after failure", async () => {
    const results: number[] = [];
    const lock = new AsyncLock();

    await Promise.all([
      lock.acquire("test", async () => results.push(1)),
      lock.acquire("test", async () => results.push(2)),
      lock.acquire("test", async () => {
        throw new Error("Fail");
      }),
      lock.acquire("test", async () => results.push(4)),
    ]).catch(() => undefined); // we ignore the error

    expect(results).toEqual([1, 2, 4]);
  });
});
