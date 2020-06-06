import Dockerode from "dockerode";
import { GenericContainer } from "./generic-container";
import { Network } from "./network";

jest.setTimeout(45000);

describe("Network", () => {
  it("should start container in a user-defined network", async () => {
    const network = await new Network().start();

    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withNetworkMode(network.getName())
      .start();

    const dockerodeClient = new Dockerode();

    const dockerContainer = dockerodeClient.getContainer(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.NetworkMode).toBe(network.getName());

    await container.stop();
    await network.close();
  });

  it("two containers in user-defined network should be able to ping each other by name", async () => {
    const network = await new Network().start();

    const container1 = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withName("container1")
      .withNetworkMode(network.getName())
      .start();

    const container2 = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withName("container2")
      .withNetworkMode(network.getName())
      .start();

    const { exitCode } = await container1.exec(["ping", "-c", "3", "container2"]);

    expect(exitCode).toBe(0);

    await container1.stop();
    await container2.stop();
    await network.close();
  });
});
