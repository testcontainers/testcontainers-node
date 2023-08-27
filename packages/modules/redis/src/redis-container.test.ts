import { createClient } from "redis";
import { RedisContainer, StartedRedisContainer } from "./redis-container";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

describe("RedisContainer", () => {
  jest.setTimeout(240_000);

  // connect {
  it("should connect and execute set-get", async () => {
    const container = await new RedisContainer().start();

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });
  // }

  it("should connect with password and execute set-get", async () => {
    const container = await new RedisContainer().withPassword("test").start();

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });

  it("should reconnect with volume and persist data", async () => {
    const volume = fs.mkdtempSync(path.join(os.tmpdir(), "redis-"));
    const container = await new RedisContainer().withPassword("test").withVolume(volume).start();
    let client = await connectTo(container);

    await client.set("key", "val");
    await client.disconnect();
    await container.restart();
    client = await connectTo(container);
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
    fs.rmSync(volume, { force: true, recursive: true });
  });

  // uriConnect {
  it("should work with URI and credentials", async () => {
    const password = "testPassword";

    // Test authentication
    const container = await new RedisContainer().withPassword(password).start();
    expect(container.getConnectionUri()).toEqual(`redis://:${password}@${container.getHost()}:${container.getPort()}`);

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });
  // }

  // executeQuery {
  it("should execute a query and return the result", async () => {
    const container = await new RedisContainer().start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);
    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));

    await container.stop();
  });
  // }
  async function connectTo(container: StartedRedisContainer) {
    const client = createClient({
      url: container.getConnectionUri(),
    });
    await client.connect();
    expect(client.isOpen).toBeTruthy();
    return client;
  }
});
