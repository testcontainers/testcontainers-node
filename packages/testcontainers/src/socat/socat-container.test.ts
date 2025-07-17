import { GenericContainer } from "../generic-container/generic-container";
import { Network } from "../network/network";
import { SocatContainer } from "./socat-container";

describe("SocatContainer", { timeout: 120_000 }, () => {
  it("should forward requests to helloworld container", async () => {
    await using network = await new Network().start();
    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("helloworld")
      .start();
    await using socat = await new SocatContainer().withNetwork(network).withTarget(8080, "helloworld").start();

    const socatUrl = `http://${socat.getHost()}:${socat.getMappedPort(8080)}`;
    const response = await fetch(`${socatUrl}/hello-world`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello-world");
  });

  it("should forward requests to helloworld container in a different port", async () => {
    await using network = await new Network().start();
    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("helloworld")
      .start();
    await using socat = await new SocatContainer().withNetwork(network).withTarget(8081, "helloworld", 8080).start();

    const socatUrl = `http://${socat.getHost()}:${socat.getMappedPort(8081)}`;
    const response = await fetch(`${socatUrl}/hello-world`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello-world");
  });
});
