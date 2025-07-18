import { getContainerRuntimeClient } from "../container-runtime";
import { Network } from "../network/network";
import { GenericContainer } from "./generic-container";

describe("GenericContainer network", { timeout: 180_000 }, () => {
  it("should set network mode", async () => {
    const client = await getContainerRuntimeClient();
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetworkMode("host")
      .start();
    const dockerContainer = await client.container.getById(container.getId());
    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.NetworkMode).toBe("host");
  });

  it("should set network aliases", async () => {
    await using network = await new Network().start();
    await using fooContainer = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .withNetworkAliases("foo")
      .start();
    await using barContainer = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .withNetworkAliases("bar", "baz")
      .start();

    expect((await fooContainer.exec(["getent", "hosts", "bar"])).exitCode).toBe(0);
    expect((await fooContainer.exec(["getent", "hosts", "baz"])).exitCode).toBe(0);
    expect((await barContainer.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
    expect((await barContainer.exec(["getent", "hosts", "unknown"])).exitCode).not.toBe(0);
  });

  it("should set extra hosts", async () => {
    await using fooContainer = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExtraHosts([{ host: "foo", ipAddress: fooContainer.getIpAddress(fooContainer.getNetworkNames()[0]) }])
      .start();

    expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
    expect((await container.exec(["getent", "hosts", "unknown"])).exitCode).not.toBe(0);
  });
});
