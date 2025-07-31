import fs from "fs";
import os from "os";
import path from "path";
import { createClient } from "redis";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { RedisContainer } from "./redis-container";

const IMAGE = getImage(__dirname);

describe("RedisContainer", { timeout: 240_000 }, () => {
  it("should connect and execute set-get", async () => {
    // redisStartContainer {
    await using container = await new RedisContainer(IMAGE).start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
    // }
  });

  it("should connect with password and execute set-get", async () => {
    await using container = await new RedisContainer(IMAGE).withPassword("test").start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it("should reconnect with volume and persistence data", async () => {
    // persistentData {
    const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), "redis-"));

    await using container = await new RedisContainer(IMAGE).withPassword("test").withPersistence(sourcePath).start();

    let client = createClient({ url: container.getConnectionUrl() });
    await client.connect();
    await client.set("key", "val");
    client.destroy();

    await container.restart();
    client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    expect(await client.get("key")).toBe("val");

    client.destroy();
    fs.rmSync(sourcePath, { force: true, recursive: true });
    // }
  });

  it("should load initial data and can read it", async () => {
    // withPredefinedData {
    await using container = await new RedisContainer(IMAGE)
      .withPassword("test")
      .withInitialData(path.join(__dirname, "initData.redis"))
      .start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    const user = {
      first_name: "David",
      last_name: "Bloom",
      dob: "03-MAR-1981",
    };
    expect(await client.get("user:002")).toBe(JSON.stringify(user));

    client.destroy();
    // }
  });

  it("should start with credentials and login", async () => {
    // redisStartWithCredentials {
    const password = "testPassword";

    await using container = await new RedisContainer(IMAGE).withPassword(password).start();

    expect(container.getConnectionUrl()).toEqual(`redis://:${password}@${container.getHost()}:${container.getPort()}`);
    // }

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it("should execute container cmd and return the result", async () => {
    // executeCommand {
    await using container = await new RedisContainer(IMAGE).start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);

    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));
    // }
  });

  it("should start with redis-stack-server and json module", async () => {
    // startWithRedisStack {
    await using container = await new RedisContainer("redis/redis-stack-server:7.4.0-v4")
      .withPassword("testPassword")
      .start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.json.set("key", "$", { name: "test" });
    const result = await client.json.get("key");
    expect(result).toEqual({ name: "test" });

    client.destroy();
    // }
  });
});
