import path from "node:path";
import { Client } from "pg";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { PostgreSqlContainer } from "./postgresql-container";

const IMAGE = getImage(__dirname);
const SSL_SERVER_CERT = path.resolve(__dirname, "test-certs/server.crt");
const SSL_SERVER_KEY = path.resolve(__dirname, "test-certs/server.key");

describe("PostgisContainer", { timeout: 180_000 }, () => {
  it("should work", async () => {
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

  it("should restart", async () => {
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

  it("should connect with SSL", async () => {
    await using container = await new PostgreSqlContainer(IMAGE).withSSL(SSL_SERVER_CERT, SSL_SERVER_KEY).start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
      ssl: {
        rejectUnauthorized: false,
      },
    });
    await client.connect();

    const result = await client.query("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()");
    expect(result.rows[0]).toEqual({ ssl: true });

    await client.end();
  });
});
