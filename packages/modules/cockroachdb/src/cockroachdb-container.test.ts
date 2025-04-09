import { Client } from "pg";
import { CockroachDbContainer } from "./cockroachdb-container";

const IMAGE = "cockroachdb/cockroach:v24.3.5";

describe("CockroachDbContainer", { timeout: 180_000 }, () => {
  // connect {
  it("should connect and return a query result", async () => {
    const container = await new CockroachDbContainer(IMAGE).start();

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
    const container = await new CockroachDbContainer(IMAGE).start();

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
    const container = await new CockroachDbContainer(IMAGE).withDatabase("custom_database").start();

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
    const container = await new CockroachDbContainer(IMAGE).withUsername("custom_username").start();

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
    const container = await new CockroachDbContainer(IMAGE).start();
    await container.restart();

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

  it("should allow custom healthcheck", async () => {
    const container = new CockroachDbContainer(IMAGE).withHealthCheck({
      test: ["CMD-SHELL", "exit 1"],
      interval: 100,
      retries: 0,
      timeout: 0,
    });

    await expect(() => container.start()).rejects.toThrow();
  });
});
