import { Client } from "pg";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { PostgreSqlContainer } from "./postgresql-container";

const IMAGE = getImage(__dirname);

describe("PostgisContainer", { timeout: 180_000 }, () => {
  it.concurrent("should work", async () => {
    const container = await new PostgreSqlContainer(IMAGE).start();

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

  it.concurrent("should restart", async () => {
    const container = await new PostgreSqlContainer(IMAGE).start();
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
    await container.stop();
  });
});
