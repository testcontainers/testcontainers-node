import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createClient } from "redis";
import { StartedValkeyContainer, ValkeyContainer } from "./valkey-container";

describe("ValkeyContainer", { timeout: 240_000 }, () => {
  it("should connect and execute set-get", async () => {
    const container = await new ValkeyContainer().start();

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });

  it("should connect with password and execute set-get", async () => {
    const container = await new ValkeyContainer().withPassword("test").start();

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });

  it("should reconnect with volume and persistence data", async () => {
    const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), "valkey-"));
    const container = await new ValkeyContainer().withPassword("test").withPersistence(sourcePath).start();
    let client = await connectTo(container);

    await client.set("key", "val");
    await client.disconnect();
    await container.restart();
    client = await connectTo(container);
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
    try {
      fs.rmSync(sourcePath, { force: true, recursive: true });
    } catch (e) {
      //Ignore clean up, when have no access on fs.
      console.log(e);
    }
  });

  it("should load initial data and can read it", async () => {
    const container = await new ValkeyContainer()
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
    await container.stop();
  });

  it("should start with credentials and login", async () => {
    const password = "testPassword";

    const container = await new ValkeyContainer().withPassword(password).start();
    expect(container.getConnectionUrl()).toEqual(`redis://:${password}@${container.getHost()}:${container.getPort()}`);

    const client = await connectTo(container);

    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });

  it("should execute container cmd and return the result", async () => {
    const container = await new ValkeyContainer().start();

    const queryResult = await container.executeCliCmd("info", ["clients"]);
    expect(queryResult).toEqual(expect.stringContaining("connected_clients:1"));

    await container.stop();
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
