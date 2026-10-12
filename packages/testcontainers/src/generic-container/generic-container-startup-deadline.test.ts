import type { StartedTestContainer } from "../test-container";
import type { InspectResult } from "../types";
import { AbstractWaitStrategy } from "../wait-strategies/wait-strategy";
import { GenericContainer } from "./generic-container";
import type { StartupDeadline } from "./startup-deadline";

describe("GenericContainer startup deadline", { timeout: 180_000 }, () => {
  it("should give containerStarted the startup timeout left after the wait strategy", async () => {
    const waitStrategy = new SlowWaitStrategy();
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(60_000)
      .withWaitStrategy(waitStrategy);

    await using _ = await container.start();

    const [remainingMs] = container.remainingStartupMs;
    expect(remainingMs).toBeGreaterThan(0);
    expect(remainingMs).toBeLessThanOrEqual(60_000 - waitStrategy.waitedMs);
  });

  it("should not give containerStarted a startup deadline when no startup timeout is set", async () => {
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      new SlowWaitStrategy()
    );

    await using _ = await container.start();

    expect(container.remainingStartupMs).toEqual([undefined]);
  });

  class RecordingContainer extends GenericContainer {
    public readonly remainingStartupMs: Array<number | undefined> = [];

    protected override async containerStarted(
      _container: StartedTestContainer,
      _inspectResult: InspectResult,
      _reused: boolean,
      startupDeadline?: StartupDeadline
    ): Promise<void> {
      this.remainingStartupMs.push(startupDeadline?.getRemainingMs());
    }
  }

  class SlowWaitStrategy extends AbstractWaitStrategy {
    public waitedMs = 0;

    public async waitUntilReady(): Promise<void> {
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.waitedMs = Date.now() - startTime;
    }
  }
});
