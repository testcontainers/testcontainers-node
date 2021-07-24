import { Client } from "pg";
import { PostgresContainer } from "./postgres-container";

describe("PostgresContainer", () => {
  jest.setTimeout(180_000);

  it("should work", async () => {
    const container = await new PostgresContainer().start();

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
