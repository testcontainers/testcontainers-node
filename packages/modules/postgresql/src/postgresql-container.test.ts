import { Client } from "pg";
import { PostgreSqlContainer } from "./postgresql-container";

describe("PostgreSqlContainer", () => {
  jest.setTimeout(180_000);

  // connect {
  it("should connect and return a query result", async () => {
    const container = await new PostgreSqlContainer().start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": 1 });

    await client.end();
    await container.stop();
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const container = await new PostgreSqlContainer().start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": 1 });

    await client.end();
    await container.stop();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const container = await new PostgreSqlContainer().withDatabase("customDatabase").start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
    await client.connect();

    const result = await client.query("SELECT current_database()");
    expect(result.rows[0]).toEqual({ current_database: "customDatabase" });

    await client.end();
    await container.stop();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const container = await new PostgreSqlContainer().withUsername("customUsername").start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
    await client.connect();

    const result = await client.query("SELECT current_user");
    expect(result.rows[0]).toEqual({ current_user: "customUsername" });

    await client.end();
    await container.stop();
  });
  // }
});
