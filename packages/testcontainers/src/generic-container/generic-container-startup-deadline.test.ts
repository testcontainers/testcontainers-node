import type { StartupDeadline } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { StartedTestContainer } from "../test-container";
import type { InspectResult } from "../types";
import { BoundPorts } from "../utils/bound-ports";
import { Wait } from "../wait-strategies/wait";
import { waitForContainer } from "../wait-strategies/wait-for-container";
import { AbstractWaitStrategy } from "../wait-strategies/wait-strategy";
import { GenericContainer } from "./generic-container";

describe("GenericContainer startup deadline", { timeout: 180_000 }, () => {
  it("should give the lifecycle callbacks the startup timeout that is left", async () => {
    const waitStrategy = new SlowWaitStrategy();
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(60_000)
      .withWaitStrategy(waitStrategy);

    await using _ = await container.start();

    const [startingMs] = container.remainingMsWhenStarting;
    const [startedMs] = container.remainingMsWhenStarted;
    expect(startingMs).toBeLessThanOrEqual(60_000);
    expect(startedMs).toBeGreaterThan(0);
    expect(startedMs).toBeLessThanOrEqual(60_000 - waitStrategy.waitedMs);
  });

  it("should not give the lifecycle callbacks a startup deadline when no startup timeout is set", async () => {
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      new SlowWaitStrategy()
    );

    await using _ = await container.start();

    expect(container.remainingMsWhenStarting).toEqual([undefined]);
    expect(container.remainingMsWhenStarted).toEqual([undefined]);
  });

  it("should apply the startup timeout to a wait in containerStarted", async () => {
    const container = new WaitingContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(2_000)
      .withWaitStrategy(new SlowWaitStrategy());
    const startTime = Date.now();

    await expect(container.start()).rejects.toThrow('Log message "never logged" not received');

    expect(Date.now() - startTime).toBeLessThan(60_000);
  });

  class RecordingContainer extends GenericContainer {
    public readonly remainingMsWhenStarting: Array<number | undefined> = [];
    public readonly remainingMsWhenStarted: Array<number | undefined> = [];

    protected override async containerStarting(
      _inspectResult: InspectResult,
      _reused: boolean,
      startupDeadline?: StartupDeadline
    ): Promise<void> {
      this.remainingMsWhenStarting.push(startupDeadline?.getRemainingMs());
    }

    protected override async containerStarted(
      _container: StartedTestContainer,
      _inspectResult: InspectResult,
      _reused: boolean,
      startupDeadline?: StartupDeadline
    ): Promise<void> {
      this.remainingMsWhenStarted.push(startupDeadline?.getRemainingMs());
    }
  }

  class WaitingContainer extends GenericContainer {
    protected override async containerStarted(
      container: StartedTestContainer,
      inspectResult: InspectResult
    ): Promise<void> {
      const client = await getContainerRuntimeClient();
      await waitForContainer(
        client,
        client.container.getById(container.getId()),
        Wait.forLogMessage("never logged"),
        BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult)
      );
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
