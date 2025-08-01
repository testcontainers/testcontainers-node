import { Client } from "pg";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { CockroachDbContainer } from "./cockroachdb-container";

const IMAGE = getImage(__dirname);

describe("CockroachDbContainer", { timeout: 180_000 }, () => {
  it("should connect and return a query result", async () => {
    // cockroachConnect {
    await using container = await new CockroachDbContainer(IMAGE).start();

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
    // }
  });

  it("should work with database URI", async () => {
    // uriConnect {
    await using container = await new CockroachDbContainer(IMAGE).start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    // }

    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": "1" });

    await client.end();
  });

  it("should set database", async () => {
    // setDatabase {
    await using container = await new CockroachDbContainer(IMAGE).withDatabase("custom_database").start();
    // }

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
  });

  it("should set username", async () => {
    // setUsername {
    await using container = await new CockroachDbContainer(IMAGE).withUsername("custom_username").start();
    // }

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
  });

  it("should work with restarted container", async () => {
    await using container = await new CockroachDbContainer(IMAGE).start();
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
