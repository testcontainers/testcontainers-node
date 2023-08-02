import { GenericContainer, StartupCheckStrategy, StartupStatus } from "testcontainers";
import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";

jest.setTimeout(180_000);

describe("StartupCheckStrategy", () => {
  let client: ContainerRuntimeClient;

  beforeAll(async () => {
    client = await getContainerRuntimeClient();
  });

  it("should wait until ready", async () => {
    const waitStrategy = new (class extends StartupCheckStrategy {
      private count = 0;

      public override async checkStartupState(): Promise<StartupStatus> {
        if (this.count < 1) {
          this.count++;
          return "PENDING";
        } else {
          return "SUCCESS";
        }
      }
    })(client);

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withWaitStrategy(waitStrategy)
      .start();

    await container.stop();
  });

  it("should fail when status PENDING after timeout", async () => {
    const waitStrategy = new (class extends StartupCheckStrategy {
      public override async checkStartupState(): Promise<StartupStatus> {
        return "PENDING";
      }
    })(client);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withWaitStrategy(waitStrategy)
        .withStartupTimeout(3000)
        .start()
    ).rejects.toThrowError("Container not accessible after 3000ms");
  });

  it("should fail immediately when status FAILED", async () => {
    const waitStrategy = new (class extends StartupCheckStrategy {
      public count = 0;

      public override async checkStartupState(): Promise<StartupStatus> {
        this.count++;
        return "FAIL";
      }
    })(client);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withWaitStrategy(waitStrategy)
        .withStartupTimeout(3000)
        .start()
    ).rejects.toThrowError("Container failed to start for");
    expect(waitStrategy.count).toBe(1);
  });
});
