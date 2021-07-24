import { Client } from "pg";
import { PostgreSqlContainer } from "./postgresql-container";

describe("PostgreSqlContainer", () => {
  jest.setTimeout(180_000);

  it("should work", async () => {
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
});
