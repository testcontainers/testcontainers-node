import { getContainerRuntimeClient } from "../container-runtime";
import type { StartedTestContainer } from "../test-container";
import type { InspectResult } from "../types";
import { BoundPorts } from "../utils/bound-ports";
import { Wait } from "../wait-strategies/wait";
import { waitForContainer } from "../wait-strategies/wait-for-container";
import { AbstractWaitStrategy } from "../wait-strategies/wait-strategy";
import { GenericContainer } from "./generic-container";

describe("GenericContainer startup timeout", { timeout: 180_000 }, () => {
  it("should give the lifecycle callbacks a signal for the startup timeout", async () => {
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(60_000)
      .withWaitStrategy(new SlowWaitStrategy());

    await using _ = await container.start();

    expect(container.startingSignals).toEqual([expect.any(AbortSignal)]);
    expect(container.startedSignals[0]).toBe(container.startingSignals[0]);
    expect(container.startedSignalAborted).toEqual([false]);
  });

  it("should start the startup timeout before the wait strategy", async () => {
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(50)
      .withWaitStrategy(new SlowWaitStrategy());

    await using _ = await container.start();

    expect(container.startedSignalAborted).toEqual([true]);
  });

  it("should not give the lifecycle callbacks a signal when no startup timeout is set", async () => {
    const container = new RecordingContainer("cristianrgreco/testcontainer:1.1.14").withWaitStrategy(
      new SlowWaitStrategy()
    );

    await using _ = await container.start();

    expect(container.startingSignals).toEqual([undefined]);
    expect(container.startedSignals).toEqual([undefined]);
  });

  it("should apply the startup timeout to a wait in containerStarted", async () => {
    const container = new WaitingContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(2_000)
      .withWaitStrategy(new SlowWaitStrategy());
    const startTime = Date.now();

    await expect(container.start()).rejects.toThrow('Log message "never logged" not received');

    expect(Date.now() - startTime).toBeLessThan(60_000);
  });

  it("should apply the startup timeout to a wait strategy with a longer timeout after a restart", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withStartupTimeout(2_000)
      .withWaitStrategy(
        Wait.forAll([
          Wait.forSuccessfulCommand("[ ! -f /tmp/started ] && touch /tmp/started").withStartupTimeout(60_000),
        ])
      )
      .start();
    const startTime = Date.now();

    await expect(container.restart()).rejects.toThrow("not successful");

    expect(Date.now() - startTime).toBeLessThan(60_000);
  });

  class RecordingContainer extends GenericContainer {
    public readonly startingSignals: Array<AbortSignal | undefined> = [];
    public readonly startedSignals: Array<AbortSignal | undefined> = [];
    public readonly startedSignalAborted: Array<boolean | undefined> = [];

    protected override async containerStarting(
      _inspectResult: InspectResult,
      _reused: boolean,
      startupSignal?: AbortSignal
    ): Promise<void> {
      this.startingSignals.push(startupSignal);
    }

    protected override async containerStarted(
      _container: StartedTestContainer,
      _inspectResult: InspectResult,
      _reused: boolean,
      startupSignal?: AbortSignal
    ): Promise<void> {
      this.startedSignals.push(startupSignal);
      this.startedSignalAborted.push(startupSignal?.aborted);
    }
  }

  class WaitingContainer extends GenericContainer {
    protected override async containerStarted(
      container: StartedTestContainer,
      inspectResult: InspectResult,
      _reused: boolean,
      startupSignal?: AbortSignal
    ): Promise<void> {
      const client = await getContainerRuntimeClient();
      await waitForContainer(
        client,
        client.container.getById(container.getId()),
        Wait.forLogMessage("never logged"),
        BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult),
        undefined,
        startupSignal
      );
    }
  }

  class SlowWaitStrategy extends AbstractWaitStrategy {
    public async waitUntilReady(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
});
