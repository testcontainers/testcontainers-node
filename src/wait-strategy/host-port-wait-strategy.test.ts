import { GenericContainer } from "../generic-container/generic-container";
import { checkContainerIsHealthy, getRunningContainerNames } from "../test-helper";
import { RandomUuid } from "../uuid";

jest.setTimeout(180_000);

describe("HostPortWaitStrategy", () => {
  it("should wait for port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

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
});
