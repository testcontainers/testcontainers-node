import { Client } from "pg";
import { getImage } from "testcontainers/src/utils/test-helper";
import { PostgreSqlContainer } from "./postgresql-container";

const IMAGE = getImage(__dirname);

describe("PostgreSqlContainer", { timeout: 180_000 }, () => {
  // connect {
  it("should connect and return a query result", async () => {
    await using container = await new PostgreSqlContainer(IMAGE).start();

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
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    await using container = await new PostgreSqlContainer(IMAGE).start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": 1 });

    await client.end();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    await using container = await new PostgreSqlContainer(IMAGE).withDatabase("customDatabase").start();

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
  });
  // }

  // setUsername {
  it("should set username", async () => {
    await using container = await new PostgreSqlContainer(IMAGE).withUsername("customUsername").start();

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
  });
  // }

  it("should work with restarted container", async () => {
    await using container = await new PostgreSqlContainer(IMAGE).start();
    await container.restart();

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
  });

  it("should allow custom healthcheck", async () => {
    await using container = new PostgreSqlContainer(IMAGE).withHealthCheck({
      test: ["CMD-SHELL", "exit 1"],
      interval: 100,
      retries: 0,
      timeout: 0,
    });

    await expect(() => container.start()).rejects.toThrow();
  });
});
