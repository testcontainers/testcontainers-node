import { RandomUuid } from "../common";
import { GenericContainer } from "../generic-container/generic-container";
import { checkContainerIsHealthy, getRunningContainerNames } from "../utils/test-helper";
import { Wait } from "./wait";

describe("LogWaitStrategy", { timeout: 180_000 }, () => {
  it("should wait for log", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for log with regex", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage(/Listening on port \d+/))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for a new log after restart", async () => {
    const start = new Date();
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCommand(["/bin/sh", "-c", 'sleep 2; echo "Ready"'])
      .withWaitStrategy(Wait.forLogMessage("Ready"))
      .start();

    expect(new Date().getTime() - start.getTime()).toBeGreaterThanOrEqual(2_000);
    await container.restart();
    expect(new Date().getTime() - start.getTime()).toBeGreaterThanOrEqual(4_000);

    await container.stop();
  });

  it("should stop the container when the log message wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage("unexpected"))
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError(`Log message "unexpected" not received after 0ms`);

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });
});
