import { fetch } from "undici";
import { GenericContainer } from "../generic-container/generic-container";
import { Network } from "../network/network";
import { SocatContainer } from "./socat-container";

describe("Socat", { timeout: 120_000 }, () => {
  it("should forward requests to helloworld container", async () => {
    const network = await new Network().start();

    const helloworld = await new GenericContainer("testcontainers/helloworld:1.2.0")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("helloworld")
      .start();

    const socat = await new SocatContainer().withNetwork(network).withTarget(8080, "helloworld").start();

    const socatUrl = `http://${socat.getHost()}:${socat.getMappedPort(8080)}`;

    const response = await fetch(`${socatUrl}/ping`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("PONG");

    await socat.stop();
    await helloworld.stop();
    await network.stop();
  });
});
