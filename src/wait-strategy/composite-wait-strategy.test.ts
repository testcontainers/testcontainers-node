import { CompositeWaitStrategy } from "./composite-wait-strategy";
import { AbstractWaitStrategy } from "./wait-strategy";
import { BoundPorts } from "../bound-ports";
import Dockerode from "dockerode";

const fakeContainer = { id: "containerId" } as Dockerode.Container;
const fakeBoundPorts = {} as BoundPorts;
const fakeStartTime = {} as Date;

test("should resolve when all wait strategies resolve", async () => {
  const waitStrategy = new CompositeWaitStrategy([
    new FakeWaitStrategy({ resolves: true }),
    new FakeWaitStrategy({ resolves: true }),
  ]);

  await expect(waitStrategy.waitUntilReady(fakeContainer, fakeBoundPorts, fakeStartTime)).resolves.toBeUndefined();
});

test("should reject when any wait strategy rejects", async () => {
  const error = new Error("FAILED");
  const waitStrategy = new CompositeWaitStrategy([
    new FakeWaitStrategy({ resolves: true }),
    new FakeWaitStrategy({ resolves: false, error }),
  ]);

  await expect(waitStrategy.waitUntilReady(fakeContainer, fakeBoundPorts, fakeStartTime)).rejects.toThrowError(error);
});

test("should set the startup timeout to the maximum of all wait strategies", async () => {
  const waitStrategy = new CompositeWaitStrategy([
    new FakeWaitStrategy({ resolves: true }).withStartupTimeout(1000),
    new FakeWaitStrategy({ resolves: true }).withStartupTimeout(2000),
  ]);

  expect(waitStrategy.getStartupTimeout()).toEqual(2000);
});

test("should override startup timeouts when one is provided", async () => {
  const s1 = new FakeWaitStrategy({ resolves: true }).withStartupTimeout(1000);
  const s2 = new FakeWaitStrategy({ resolves: true }).withStartupTimeout(2000);
  const waitStrategy = new CompositeWaitStrategy([s1, s2]).withStartupTimeout(3000);

  expect(s1.getStartupTimeout()).toEqual(3000);
  expect(s2.getStartupTimeout()).toEqual(3000);
  expect(waitStrategy.getStartupTimeout()).toEqual(3000);
});

test("should enforce startup timeout", async () => {
  const waitStrategy = new CompositeWaitStrategy([
    new FakeWaitStrategy({ resolves: true, delay: 1000 }),
    new FakeWaitStrategy({ resolves: true, delay: 1000 }),
  ]).withStartupTimeout(0);

  await expect(waitStrategy.waitUntilReady(fakeContainer, fakeBoundPorts, fakeStartTime)).rejects.toThrowError(
    "not resolved after 0ms"
  );
});

class FakeWaitStrategy extends AbstractWaitStrategy {
  constructor(private opts: { resolves: boolean; error?: Error; delay?: number }) {
    super();
  }

  async waitUntilReady(): Promise<void> {
    if (this.opts.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.opts.delay));
    }
    if (this.opts.resolves) {
      return Promise.resolve();
    } else {
      return Promise.reject(this.opts.error);
    }
  }
}
