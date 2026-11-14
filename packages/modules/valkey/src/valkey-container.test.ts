import fs from "node:fs";
import path from "node:path";
import { createClient } from "redis";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ValkeyContainer } from "./valkey-container";

const IMAGES = ["valkey/valkey:7.2.14", "valkey/valkey:8.1.10", getImage(__dirname)];

describe.each(IMAGES)("ValkeyContainer (%s)", { concurrent: false, timeout: 240_000 }, (image) => {
  it.concurrent("should connect and execute set-get", async () => {
    // valkeyStartContainer {
    await using container = await new ValkeyContainer(image).start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
    // }
  });

  it.concurrent("should connect with password and execute set-get", async () => {
    await using container = await new ValkeyContainer(image).withPassword("test").start();

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it.concurrent("should reconnect with volume and persistence data", async () => {
    // valkeyWithPersistentData {
    const sourcePath = fs.mkdtempSync("valkey-");

    await using container = await new ValkeyContainer(image).withPassword("test").withPersistence(sourcePath).start();

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

  it.concurrent("should load initial data and can read it", async () => {
    // valkeyWithPredefinedData {
    await using container = await new ValkeyContainer(image)
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

  it.concurrent("should copy the initial data files readable by a non-root user", async () => {
    await using container = await new ValkeyContainer(image)
      .withInitialData(path.join(__dirname, "initData.valkey"))
      .start();

    const { exitCode } = await container.exec(
      ["sh", "-c", "test -r /tmp/import.valkey && test -r /tmp/import.sh && test -x /tmp/import.sh"],
      { user: "valkey" }
    );

    expect(exitCode).toBe(0);
  });

  it.concurrent("should start with username and password", async () => {
    // valkeyWithUsernameAndPassword {
    const username = "testUser";
    const password = "testPassword";

    await using container = await new ValkeyContainer(image).withUsername(username).withPassword(password).start();

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

  it.concurrent("should start with password only", async () => {
    // valkeyWithPassword {
    const password = "testPassword";

    await using container = await new ValkeyContainer(image).withPassword(password).start();

    expect(container.getConnectionUrl()).toEqual(`redis://:${password}@${container.getHost()}:${container.getPort()}`);
    // }

    const client = createClient({ url: container.getConnectionUrl() });
    await client.connect();

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    client.destroy();
  });

  it.concurrent("should execute container cmd and return the result", async () => {
    // valkeyExecuteCommand {
    await using container = await new ValkeyContainer(image).start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);

    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));
    // }
  });
});
