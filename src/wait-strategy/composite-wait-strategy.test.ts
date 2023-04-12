import { CompositeWaitStrategy } from "./composite-wait-strategy";
import { AbstractWaitStrategy } from "./wait-strategy";
import { BoundPorts } from "../bound-ports";
import Dockerode from "dockerode";

const fakeContainer = {} as Dockerode.Container;
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

test("should override startup timeouts when once is provided", async () => {
  const waitStrategy = new CompositeWaitStrategy([
    new FakeWaitStrategy({ resolves: true }).withStartupTimeout(1000),
    new FakeWaitStrategy({ resolves: true }).withStartupTimeout(2000),
  ]).withStartupTimeout(3000);

  expect(waitStrategy.getStartupTimeout()).toEqual(3000);
});

class FakeWaitStrategy extends AbstractWaitStrategy {
  constructor(private opts: { resolves: boolean; error?: Error }) {
    super();
  }

  waitUntilReady(): Promise<void> {
    if (this.opts.resolves) {
      return Promise.resolve();
    } else {
      return Promise.reject(this.opts.error);
    }
  }
}
