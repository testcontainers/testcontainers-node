import fs from "fs";
import path from "path";
import { createClient } from "redis";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ValkeyContainer } from "./valkey-container";

const IMAGE = getImage(__dirname);

describe("ValkeyContainer", { timeout: 240_000 }, () => {
  it("should connect and execute set-get", async () => {
    // valkeyStartContainer {
    await using container = await new ValkeyContainer(IMAGE).start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
    // }
  });

  it("should connect with password and execute set-get", async () => {
    await using container = await new ValkeyContainer(IMAGE).withPassword("test").start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it("should reconnect with volume and persistence data", async () => {
    // valkeyWithPersistentData {
    const sourcePath = fs.mkdtempSync("valkey-");

    await using container = await new ValkeyContainer(IMAGE).withPassword("test").withPersistence(sourcePath).start();

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
    // valkeyWithPredefinedData {
    await using container = await new ValkeyContainer(IMAGE)
      .withPassword("test")
      .withInitialData(path.join(__dirname, "initData.valkey"))
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

  it("should start with username and password", async () => {
    // valkeyWithUsernameAndPassword {
    const username = "testUser";
    const password = "testPassword";

    await using container = await new ValkeyContainer(IMAGE).withUsername(username).withPassword(password).start();

    expect(container.getConnectionUrl()).toEqual(
      `redis://${username}:${password}@${container.getHost()}:${container.getPort()}`
    );
    // }

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it("should start with password only", async () => {
    // valkeyWithPassword {
    const password = "testPassword";

    await using container = await new ValkeyContainer(IMAGE).withPassword(password).start();

    expect(container.getConnectionUrl()).toEqual(`redis://:${password}@${container.getHost()}:${container.getPort()}`);
    // }

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it("should execute container cmd and return the result", async () => {
    // valkeyExecuteCommand {
    await using container = await new ValkeyContainer(IMAGE).start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);

    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));
    // }
  });
});
