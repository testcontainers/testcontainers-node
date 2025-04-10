import { ClickHouseClient, createClient } from "@clickhouse/client";
import { Wait } from "testcontainers";
import { ClickHouseContainer } from "./clickhouse-container";

interface ClickHouseQueryResponse<T> {
  data: T[];
}

describe("ClickHouseContainer", { timeout: 180_000 }, () => {
  it("should start successfully with default settings", async () => {
    const container = new ClickHouseContainer();
    const startedContainer = await container.start();
    expect(startedContainer.getHost()).toBeDefined();
    expect(startedContainer.getHttpPort()).toBeDefined();
    expect(startedContainer.getDatabase()).toBeDefined();
    expect(startedContainer.getUsername()).toBeDefined();
    expect(startedContainer.getPassword()).toBeDefined();
    await startedContainer.stop();
  });

  // connectWithOptions {
  it("should connect using the client options object", async () => {
    const container = await new ClickHouseContainer().start();
    let client: ClickHouseClient | undefined;

    try {
      client = createClient(container.getClientOptions());

      const result = await client.query({
        query: "SELECT 1 AS value",
        format: "JSON",
      });
      const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
      expect(data?.data?.[0]?.value).toBe(1);
    } finally {
      await client?.close();
      await container.stop();
    }
  });
  // }

  // connectWithUrl {
  it("should connect using the URL", async () => {
    const container = await new ClickHouseContainer().start();
    let client: ClickHouseClient | undefined;

    try {
      client = createClient({
        url: container.getConnectionUrl(),
      });

      const result = await client.query({
        query: "SELECT 1 AS value",
        format: "JSON",
      });

      const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
      expect(data?.data?.[0]?.value).toBe(1);
    } finally {
      await client?.close();
      await container.stop();
    }
  });
  // }

  // connectWithUsernameAndPassword {
  it("should connect using the username and password", async () => {
    const container = await new ClickHouseContainer()
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();

    let client: ClickHouseClient | undefined;

    try {
      client = createClient({
        url: container.getHttpUrl(),
        username: container.getUsername(),
        password: container.getPassword(),
      });

      const result = await client.query({
        query: "SELECT 1 AS value",
        format: "JSON",
      });

      const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
      expect(data?.data?.[0]?.value).toBe(1);
    } finally {
      await client?.close();
      await container.stop();
    }
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const customDatabase = "customDatabase";
    const container = await new ClickHouseContainer().withDatabase(customDatabase).start();

    let client: ClickHouseClient | undefined;

    try {
      client = createClient(container.getClientOptions());

      const result = await client.query({
        query: "SELECT currentDatabase() AS current_database",
        format: "JSON",
      });

      const data = (await result.json()) as ClickHouseQueryResponse<{ current_database: string }>;
      expect(data?.data?.[0]?.current_database).toBe(customDatabase);
    } finally {
      await client?.close();
      await container.stop();
    }
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const customUsername = "customUsername";
    const container = await new ClickHouseContainer().withUsername(customUsername).start();

    let client: ClickHouseClient | undefined;

    try {
      client = createClient(container.getClientOptions());

      const result = await client.query({
        query: "SELECT currentUser() AS current_user",
        format: "JSON",
      });

      const data = (await result.json()) as ClickHouseQueryResponse<{ current_user: string }>;
      expect(data?.data?.[0]?.current_user).toBe(customUsername);
    } finally {
      await client?.close();
      await container.stop();
    }
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new ClickHouseContainer().start();
    await container.restart();

    let client: ClickHouseClient | undefined;
    try {
      client = createClient(container.getClientOptions());

      const result = await client.query({
        query: "SELECT 1 AS value",
        format: "JSON",
      });

      const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
      expect(data?.data?.[0]?.value).toBe(1);
    } finally {
      await client?.close();
      await container.stop();
    }
  });

  /**
   * Verifies that a custom Docker health check that fails immediately
   * causes the container startup process (`container.start()`) to reject with an error.
   *
   * Note: This test pattern was adapted from a similar test case used for
   * PostgreSQL containers to ensure custom failing health checks are handled correctly.
   */
  it("should allow custom healthcheck", async () => {
    const container = new ClickHouseContainer()
      .withHealthCheck({
        test: ["CMD-SHELL", "exit 1"],
        interval: 100,
        retries: 0,
        timeout: 100,
      })
      .withWaitStrategy(Wait.forHealthCheck());

    await expect(() => container.start()).rejects.toThrow();
  });
});
