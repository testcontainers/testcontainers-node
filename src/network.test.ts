import { GenericContainer } from "./generic-container/generic-container";
import { Network } from "./network";
import { getContainerById } from "./docker/functions/container/get-container";

describe("Network", () => {
  jest.setTimeout(180_000);

  it("should start container in a user-defined network", async () => {
    const network = await new Network().start();

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withNetworkMode(network.getName())
      .start();

    const dockerContainer = await getContainerById(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.NetworkMode).toBe(network.getName());

    await container.stop();
    await network.stop();
  });

  it("two containers in user-defined network should be able to ping each other by name", async () => {
    const network = await new Network().start();

    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withName("container1")
      .withNetworkMode(network.getName())
      .start();

    const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withName("container2")
      .withNetworkMode(network.getName())
      .start();

    const { exitCode } = await container1.exec(["ping", "-c", "3", "container2"]);

    expect(exitCode).toBe(0);

    await container1.stop();
    await container2.stop();
    await network.stop();
  });

  it("should expose the IP address of a container in a given network", async () => {
    const network = await new Network().start();

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withNetworkMode(network.getName())
      .start();

    expect(container.getIpAddress(network.getName())).toEqual(expect.stringMatching(/^\d+\.\d+\.\d+\.\d+$/));

    await container.stop();
    await network.stop();
  });
});
