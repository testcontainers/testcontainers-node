import fs from "fs";
import os from "os";
import path from "path";
import { createClient } from "redis";
import { getImage } from "testcontainers/src/utils/test-helper";
import { StartedValkeyContainer, ValkeyContainer } from "./valkey-container";

const IMAGE = getImage(__dirname);

describe("ValkeyContainer", { timeout: 240_000 }, () => {
  it("should connect and execute set-get", async () => {
    await using container = await new ValkeyContainer(IMAGE).start();

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
  });

  it("should connect with password and execute set-get", async () => {
    await using container = await new ValkeyContainer(IMAGE).withPassword("test").start();

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
  });

  it("should reconnect with volume and persistence data", async () => {
    const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), "valkey-"));
    await using container = await new ValkeyContainer(IMAGE).withPassword("test").withPersistence(sourcePath).start();
    let client = await connectTo(container);

    await client.set("key", "val");
    await client.disconnect();
    await container.restart();
    client = await connectTo(container);
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    try {
      fs.rmSync(sourcePath, { force: true, recursive: true });
    } catch (e) {
      //Ignore clean up, when have no access on fs.
      console.log(e);
    }
  });

  it("should load initial data and can read it", async () => {
    await using container = await new ValkeyContainer(IMAGE)
      .withPassword("test")
      .withInitialData(path.join(__dirname, "initData.valkey"))
      .start();
    const client = await connectTo(container);
    const user = {
      first_name: "David",
      last_name: "Bloom",
      dob: "03-MAR-1981",
    };
    expect(await client.get("user:002")).toBe(JSON.stringify(user));

    await client.disconnect();
  });

  it("should start with credentials and login", async () => {
    const password = "testPassword";

    await using container = await new ValkeyContainer(IMAGE).withPassword(password).start();
    expect(container.getConnectionUrl()).toEqual(`redis://:${password}@${container.getHost()}:${container.getPort()}`);

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
  });

  it("should execute container cmd and return the result", async () => {
    await using container = await new ValkeyContainer(IMAGE).start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);
    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));
  });

  async function connectTo(container: StartedValkeyContainer) {
    const client = createClient({
      url: container.getConnectionUrl(),
    });
    await client.connect();
    expect(client.isOpen).toBeTruthy();
    return client;
  }
});
