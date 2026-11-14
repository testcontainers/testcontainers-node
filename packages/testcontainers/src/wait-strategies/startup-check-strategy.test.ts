import type Dockerode from "dockerode";
import { GenericContainer } from "../generic-container/generic-container";
import { StartupCheckStrategy, type StartupStatus } from "./startup-check-strategy";

describe("StartupCheckStrategy", { timeout: 180_000 }, () => {
  it("should wait until ready", async () => {
    const waitStrategy = new (class extends StartupCheckStrategy {
      private count = 0;

      public override async checkStartupState(): Promise<StartupStatus> {
        if (this.count < 1) {
          this.count++;
          return "PENDING";
        }
        return "SUCCESS";
      }
    })();

    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withWaitStrategy(waitStrategy)
      .start();
  });

  it("should fail when status PENDING after timeout", async () => {
    const waitStrategy = new (class extends StartupCheckStrategy {
      public override async checkStartupState(): Promise<StartupStatus> {
        return "PENDING";
      }
    })();

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withWaitStrategy(waitStrategy)
        .withStartupTimeout(3000)
        .start()
    ).rejects.toThrowError("Container not accessible after 3000ms");
  });

  it("should abort the signal passed to the startup check when the timeout is reached", async () => {
    const signals: (AbortSignal | undefined)[] = [];
    const waitStrategy = new (class extends StartupCheckStrategy {
      public override async checkStartupState(
        _dockerClient: Dockerode,
        _containerId: string,
        signal?: AbortSignal
      ): Promise<StartupStatus> {
        signals.push(signal);
        return "PENDING";
      }
    })();

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withWaitStrategy(waitStrategy)
        .withStartupTimeout(1000)
        .start()
    ).rejects.toThrowError("Container not accessible after 1000ms");
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal?.aborted)).toBe(true);
  });

  it("should fail immediately when status FAILED", async () => {
    const waitStrategy = new (class extends StartupCheckStrategy {
      public count = 0;

      public override async checkStartupState(): Promise<StartupStatus> {
        this.count++;
        return "FAIL";
      }
    })();

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withWaitStrategy(waitStrategy)
        .withStartupTimeout(3000)
        .start()
    ).rejects.toThrowError("Container failed to start for");
    expect(waitStrategy.count).toBe(1);
  });
});
