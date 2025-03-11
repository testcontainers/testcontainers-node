import { createClient } from "redis";
import { GenericContainer, Network } from "testcontainers";
import { ToxiProxyContainer, TPClient } from "./toxiproxy-container";

describe("ToxiProxyContainer", { timeout: 240_000 }, () => {
  // Helper to connect to redis
  async function connectTo(url: string) {
    const client = createClient({
      url,
    });
    client.on("error", () => {}); // Ignore errors
    await client.connect();
    expect(client.isOpen).toBeTruthy();
    return client;
  }

  // create_proxy {
  it("Should create a proxy to an endpoint", async () => {
    const containerNetwork = await new Network().start();
    const redisContainer = await new GenericContainer("redis:7.2")
      .withNetwork(containerNetwork)
      .withNetworkAliases("redis")
      .start();

    const toxiproxyContainer = await new ToxiProxyContainer().withNetwork(containerNetwork).start();

    // Create the proxy between Toxiproxy and Redis
    const redisProxy = await toxiproxyContainer.createProxy({
      name: "redis",
      upstream: "redis:6379",
    });

    const url = `redis://${redisProxy.host}:${redisProxy.port}`;
    const client = await connectTo(url);
    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await toxiproxyContainer.stop();
    await redisContainer.stop();
  });
  // }

  // enabled_disabled {
  it("Should enable and disable a proxy", async () => {
    const containerNetwork = await new Network().start();
    const redisContainer = await new GenericContainer("redis:7.2")
      .withNetwork(containerNetwork)
      .withNetworkAliases("redis")
      .start();

    const toxiproxyContainer = await new ToxiProxyContainer().withNetwork(containerNetwork).start();

    // Create the proxy between Toxiproxy and Redis
    const redisProxy = await toxiproxyContainer.createProxy({
      name: "redis",
      upstream: "redis:6379",
    });

    const url = `redis://${redisProxy.host}:${redisProxy.port}`;
    const client = await connectTo(url);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    // Disable any new connections to the proxy
    await redisProxy.setEnabled(false);

    await expect(client.ping()).rejects.toThrow();

    // Enable the proxy again
    await redisProxy.setEnabled(true);

    expect(await client.ping()).toBe("PONG");

    await client.disconnect();
    await toxiproxyContainer.stop();
    await redisContainer.stop();
  });
  // }

  // adding_toxic {
  it("Should add a toxic to a proxy and then remove", async () => {
    const containerNetwork = await new Network().start();
    const redisContainer = await new GenericContainer("redis:7.2")
      .withNetwork(containerNetwork)
      .withNetworkAliases("redis")
      .start();

    const toxiproxyContainer = await new ToxiProxyContainer().withNetwork(containerNetwork).start();

    // Create the proxy between Toxiproxy and Redis
    const redisProxy = await toxiproxyContainer.createProxy({
      name: "redis",
      upstream: "redis:6379",
    });

    const url = `redis://${redisProxy.host}:${redisProxy.port}`;
    const client = await connectTo(url);

    // See https://github.com/ihsw/toxiproxy-node-client for details on the instance interface
    const toxic = await redisProxy.instance.addToxic<TPClient.Latency>({
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
    await client.ping();
    const after = Date.now();
    expect(after - before).toBeGreaterThan(1000);

    await toxic.remove();

    await client.disconnect();
    await toxiproxyContainer.stop();
    await redisContainer.stop();
  });
  // }

  it("Should create multiple proxies", async () => {
    const containerNetwork = await new Network().start();
    const redisContainer = await new GenericContainer("redis:7.2")
      .withNetwork(containerNetwork)
      .withNetworkAliases("redis")
      .start();

    const toxiproxyContainer = await new ToxiProxyContainer().withNetwork(containerNetwork).start();

    // Create the proxy between Toxiproxy and Redis
    const redisProxy = await toxiproxyContainer.createProxy({
      name: "redis",
      upstream: "redis:6379",
    });

    // Create the proxy between Toxiproxy and Redis
    const redisProxy2 = await toxiproxyContainer.createProxy({
      name: "redis2",
      upstream: "redis:6379",
    });

    const url = `redis://${redisProxy.host}:${redisProxy.port}`;
    const client = await connectTo(url);
    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    const url2 = `redis://${redisProxy2.host}:${redisProxy2.port}`;
    const client2 = await connectTo(url2);
    expect(await client2.get("key")).toBe("val");

    await client.disconnect();
    await client2.disconnect();
    await toxiproxyContainer.stop();
    await redisContainer.stop();
  });

  it("Throws an error when too many proxies are created", async () => {
    const toxiproxyContainer = await new ToxiProxyContainer().start();

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

    await toxiproxyContainer.stop();
  });
});
