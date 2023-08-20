import { createClient } from "redis";
import { RedisContainer } from "./redis-container";

describe("RedisContainer", () => {
  jest.setTimeout(240_000);

  // connect {
  it("should connect and execute query", async () => {
    const container = await new RedisContainer().start();

    const client = createClient({
      url: `redis://${container.getHost()}:${container.getPort()}`,
      username: container.getUsername() != "" ? container.getUsername() : undefined,
      password: container.getPassword() != "" ? container.getPassword() : undefined,
    });
    await client.connect();

    expect(client.isOpen).toBeTruthy();
    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");

    await client.disconnect();
    await container.stop();
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const username = "testUser";
    const password = "testPassword";

    // Test authentication
    const container = await new RedisContainer().withUsername(username).withPassword(password).start();
    expect(container.getConnectionUri()).toEqual(
      `redis://${username}:${password}@${container.getHost()}:${container.getPort()}`
    );
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
});
