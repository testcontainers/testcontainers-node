import { AsyncResource } from "node:async_hooks";
import { limitToStartupDeadline, StartupDeadline, withStartupDeadline } from "./startup-deadline";

describe("StartupDeadline", () => {
  it("should not limit a timeout outside of a startup", () => {
    expect(limitToStartupDeadline(60_000)).toBe(60_000);
  });

  it("should limit a timeout to the time left of the startup deadline", async () => {
    const timeoutMs = await withStartupDeadline(new StartupDeadline(1_000), async () => limitToStartupDeadline(60_000));

    expect(timeoutMs).toBeLessThanOrEqual(1_000);
  });

  it("should not extend a timeout that is shorter than the time left", async () => {
    const timeoutMs = await withStartupDeadline(new StartupDeadline(60_000), async () => limitToStartupDeadline(100));

    expect(timeoutMs).toBe(100);
  });

  it("should not limit a timeout when the startup has no deadline", async () => {
    const timeoutMs = await withStartupDeadline(undefined, async () => limitToStartupDeadline(60_000));

    expect(timeoutMs).toBe(60_000);
  });

  it("should not limit a timeout in a callback that runs after the startup", async () => {
    const callback = await withStartupDeadline(new StartupDeadline(1_000), async () =>
      AsyncResource.bind(() => limitToStartupDeadline(60_000))
    );

    expect(callback()).toBe(60_000);
  });
});
