import { Client } from "pg";
import { CockroachDbContainer } from "./cockroachdb-container";

describe("CockroachDbContainer", () => {
  jest.setTimeout(180_000);

  // connect {
  it("should connect and return a query result", async () => {
    const container = await new CockroachDbContainer().start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      ssl: false,
    });

    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": "1" });

    await client.end();
    await container.stop();
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const container = await new CockroachDbContainer().start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": "1" });

    await client.end();
    await container.stop();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const container = await new CockroachDbContainer().withDatabase("custom_database").start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
    });
    await client.connect();

    const result = await client.query("SELECT current_database()");
    expect(result.rows[0]).toEqual({ current_database: "custom_database" });

    await client.end();
    await container.stop();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const container = await new CockroachDbContainer().withUsername("custom_username").start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
    });
    await client.connect();

    const result = await client.query("SELECT current_user");
    expect(result.rows[0]).toEqual({ current_user: "custom_username" });

    await client.end();
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new CockroachDbContainer().start();
    const port = container.getFirstMappedPort();
    await container.restart();
    expect(port).not.toEqual(container.getFirstMappedPort());

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
    });
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": "1" });

    await client.end();
    await container.stop();
  });
});
