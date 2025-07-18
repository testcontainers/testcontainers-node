import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { GenericContainer } from "../generic-container/generic-container";
import { Network } from "./network";

describe("Network", { timeout: 180_000 }, () => {
  let client: ContainerRuntimeClient;

  beforeAll(async () => {
    client = await getContainerRuntimeClient();
  });

  it("should start container via network mode", async () => {
    await using network = await new Network().start();

    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetworkMode(network.getName())
      .start();

    const dockerContainer = client.container.getById(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(Object.keys(containerInfo.NetworkSettings.Networks)).toContain(network.getName());
  });

  it("should start container via network", async () => {
    await using network = await new Network().start();

    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .start();

    const dockerContainer = client.container.getById(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(Object.keys(containerInfo.NetworkSettings.Networks)).toContain(network.getName());
  });

  it("two containers in user-defined network should be able to ping each other by name", async () => {
    await using network = await new Network().start();

    await using container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("container1")
      .withNetwork(network)
      .start();

    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("container2")
      .withNetwork(network)
      .start();

    const { exitCode } = await container1.exec(["ping", "-c", "3", "container2"]);

    expect(exitCode).toBe(0);
  });

  it("should expose the IP address of a container in a given network", async () => {
    await using network = await new Network().start();

    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .start();

    expect(container.getIpAddress(network.getName())).toEqual(expect.stringMatching(/^\d+\.\d+\.\d+\.\d+$/));
  });
});
