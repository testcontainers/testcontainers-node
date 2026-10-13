import path from "node:path";
import { Client } from "pg";
import { PostgreSqlContainer } from "./postgresql-container";
import { IMAGES } from "./test-helper";

const SSL_CA_CERT = path.resolve(__dirname, "test-certs/ca.crt");
const SSL_SERVER_CERT = path.resolve(__dirname, "test-certs/server.crt");
const SSL_SERVER_KEY = path.resolve(__dirname, "test-certs/server.key");

describe.each(IMAGES)("PostgreSqlContainer (%s)", { concurrent: false, timeout: 180_000 }, (image) => {
  it.concurrent("should connect and return a query result", async () => {
    // pgConnect {
    await using container = await new PostgreSqlContainer(image).start();

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
    // }
  });

  it.concurrent("should work with database URI", async () => {
    // pgUriConnect {
    await using container = await new PostgreSqlContainer(image).start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    // }
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": 1 });

    await client.end();
  });

  it.concurrent("should set database", async () => {
    // pgSetDatabase {
    await using container = await new PostgreSqlContainer(image).withDatabase("customDatabase").start();
    // }

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

  it.concurrent("should set username", async () => {
    // pgSetUsername {
    await using container = await new PostgreSqlContainer(image).withUsername("customUsername").start();
    // }

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

  it.concurrent("should work with restarted container", async () => {
    await using container = await new PostgreSqlContainer(image).start();
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

  it.concurrent("should allow custom healthcheck", async () => {
    const container = new PostgreSqlContainer(image).withHealthCheck({
      test: ["CMD-SHELL", "exit 1"],
      interval: 100,
      retries: 0,
      timeout: 0,
    });

    await expect(() => container.start()).rejects.toThrow();
  });

  it.concurrent("should connect with SSL", async () => {
    // pgSslConnect {
    await using container = await new PostgreSqlContainer(image)
      .withSSLCert(SSL_CA_CERT, SSL_SERVER_CERT, SSL_SERVER_KEY)
      .start();

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
    // }
  });

  it.concurrent("should validate SSL certificate paths", () => {
    const container = new PostgreSqlContainer(image);

    expect(() => container.withSSL("", "server.key")).toThrow("SSL certificate file should not be empty.");
    expect(() => container.withSSL("server.crt", "")).toThrow("SSL key file should not be empty.");
    expect(() => container.withSSLCert("", "server.crt", "server.key")).toThrow(
      "SSL CA certificate file should not be empty."
    );
  });
});
