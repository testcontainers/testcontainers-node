import path from "path";
import { GenericContainer } from "./generic-container";
import { Wait } from "../wait";
import { checkContainerIsHealthy, getRunningContainerNames } from "../test-helper";
import { RandomUuid } from "../uuid";

describe("GenericContainer wait strategies", () => {
  jest.setTimeout(180_000);

  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should wait for port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

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

  it("should wait for health check", async () => {
    const context = path.resolve(fixtures, "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    const container = await customGenericContainer
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for custom health check", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withHealthCheck({
        test: ["CMD-SHELL", "curl -f http://localhost:8080/hello-world || exit 1"],
        interval: 1000,
        timeout: 3000,
        retries: 5,
        startPeriod: 1000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should stop the container when the host port check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(containerName)
        .withExposedPorts(8081)
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError("Port 8081 not bound after 0ms");

    expect(await getRunningContainerNames()).not.toContain(containerName);
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

  it("should stop the container when the health check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    const context = path.resolve(fixtures, "docker-with-health-check-with-start-period");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    await expect(
      customGenericContainer
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHealthCheck())
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError("Health check not healthy after 0ms");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should stop the container when the health check fails", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    const context = path.resolve(fixtures, "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    await expect(
      customGenericContainer
        .withName(containerName)
        .withExposedPorts(8080)
        .withHealthCheck({ test: ["CMD-SHELL", "exit 1"], interval: 1, timeout: 3, retries: 3 })
        .withWaitStrategy(Wait.forHealthCheck())
        .start()
    ).rejects.toThrowError("Health check failed");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should wait for custom health check using CMD to run the command directly without a shell", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withHealthCheck({
        test: ["CMD", "/usr/bin/wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/hello-world"],
        interval: 1000,
        timeout: 3000,
        retries: 5,
        startPeriod: 1000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });
});
