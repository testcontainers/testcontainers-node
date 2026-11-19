import { RandomUuid } from "../common";
import { GenericContainer } from "../generic-container/generic-container";
import { checkContainerIsHealthy, getRunningContainerNames } from "../utils/test-helper";
import { Wait } from "./wait";

describe("HostPortWaitStrategy", { timeout: 180_000 }, () => {
  it("should wait for port", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should stop the container when the host port check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(containerName)
        .withExposedPorts(8081)
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError(/Port \d+(\/(tcp|udp))? not bound after 0ms/);

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should wait only for the given ports", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080, 8081)
      .withWaitStrategy(Wait.forListeningPorts(8080))
      .withStartupTimeout(10_000)
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should stop the container when a given port is not exposed", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forListeningPorts(8081))
        .start()
    ).rejects.toThrowError("No port binding found for :8081/tcp");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });
});
