import { GenericContainer, Network } from "testcontainers";
import { getImage } from "testcontainers/src/utils/test-helper";
import { ToxiProxyContainer, TPClient } from "./toxiproxy-container";

const IMAGE = getImage(__dirname);

describe("ToxiProxyContainer", { timeout: 240_000 }, () => {
  // create_proxy {
  it("should create a proxy to an endpoint", async () => {
    await using network = await new Network().start();
    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("app")
      .start();

    await using toxiproxyContainer = await new ToxiProxyContainer(IMAGE).withNetwork(network).start();

    const appProxy = await toxiproxyContainer.createProxy({
      name: "app",
      upstream: "app:8080",
    });

    const response = await fetch(`http://${appProxy.host}:${appProxy.port}/hello-world`);
    expect(response.status).toBe(200);
  });
  // }

  // enabled_disabled {
  it("should enable and disable a proxy", async () => {
    await using network = await new Network().start();
    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("app")
      .start();

    await using toxiproxyContainer = await new ToxiProxyContainer(IMAGE).withNetwork(network).start();

    const appProxy = await toxiproxyContainer.createProxy({
      name: "app",
      upstream: "app:8080",
    });

    await appProxy.setEnabled(false);
    await expect(fetch(`http://${appProxy.host}:${appProxy.port}/hello-world`)).rejects.toThrow();

    await appProxy.setEnabled(true);
    const response = await fetch(`http://${appProxy.host}:${appProxy.port}/hello-world`);
    expect(response.status).toBe(200);
  });
  // }

  // adding_toxic {
  it("should add a toxic to a proxy and then remove", async () => {
    await using network = await new Network().start();
    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("app")
      .start();

    await using toxiproxyContainer = await new ToxiProxyContainer(IMAGE).withNetwork(network).start();

    const appProxy = await toxiproxyContainer.createProxy({
      name: "app",
      upstream: "app:8080",
    });

    // See https://github.com/ihsw/toxiproxy-node-client for details on the instance interface
    const toxic = await appProxy.instance.addToxic<TPClient.Latency>({
      attributes: {
        jitter: 50,
        latency: 1500,
      },
      name: "upstream-latency",
      stream: "upstream",
      toxicity: 1, // 1 is 100%
      type: "latency",
    });

    const before = Date.now();
    await fetch(`http://${appProxy.host}:${appProxy.port}/hello-world`);
    const after = Date.now();
    expect(after - before).toBeGreaterThan(1000);

    await toxic.remove();
  });
  // }

  it("should create multiple proxies", async () => {
    await using network = await new Network().start();
    await using _ = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withNetwork(network)
      .withNetworkAliases("app")
      .start();

    await using toxiproxyContainer = await new ToxiProxyContainer(IMAGE).withNetwork(network).start();

    const appProxy = await toxiproxyContainer.createProxy({
      name: "app",
      upstream: "app:8080",
    });
    const appProxy2 = await toxiproxyContainer.createProxy({
      name: "app2",
      upstream: "app:8080",
    });

    const response = await fetch(`http://${appProxy.host}:${appProxy.port}/hello-world`);
    expect(response.status).toBe(200);

    const response2 = await fetch(`http://${appProxy2.host}:${appProxy2.port}/hello-world`);
    expect(response2.status).toBe(200);
  });

  it("throws an error when too many proxies are created", async () => {
    await using toxiproxyContainer = await new ToxiProxyContainer(IMAGE).start();

    for (let i = 0; i < 32; i++) {
      await toxiproxyContainer.createProxy({
        name: "test-" + i,
        upstream: `google.com:80`,
      });
    }

    await expect(
      toxiproxyContainer.createProxy({
        name: "test-32",
        upstream: `google.com:80`,
      })
    ).rejects.toThrow();
  });
});
