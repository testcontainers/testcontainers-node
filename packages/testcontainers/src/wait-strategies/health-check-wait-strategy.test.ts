import path from "path";
import { RandomUuid } from "../common";
import { GenericContainer } from "../generic-container/generic-container";
import { checkContainerIsHealthy, getRunningContainerNames } from "../utils/test-helper";
import { Wait } from "./wait";

const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

describe("HealthCheckWaitStrategy", { timeout: 180_000 }, () => {
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

  it("should stop the container when the health check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    const context = path.resolve(fixtures, "docker-with-health-check-with-start-period");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    await expect(
      customGenericContainer
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHealthCheck())
        .withHealthCheck({ test: ["CMD-SHELL", "sleep 10"], timeout: 10_000 })
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError("Health check not healthy after 0ms");

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
