import { createClient } from "@clickhouse/client";
import { ClickHouseContainer } from "./clickhouse-container";

interface ClickHouseQueryResponse<T> {
  data: T[];
}

describe("ClickHouseContainer", { timeout: 180_000 }, () => {
  // connectWithOptions {
  it("should connect using the client options object", async () => {
    const container = await new ClickHouseContainer().start();
    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });
    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
    await container.stop();
  });
  // }

  // connectWithUrl {
  it("should connect using the URL", async () => {
    const container = await new ClickHouseContainer().start();
    const client = createClient({
      url: container.getConnectionUrl(),
    });

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
    await container.stop();
  });
  // }

  // connectWithUsernameAndPassword {
  it("should connect using the username and password", async () => {
    const container = await new ClickHouseContainer()
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();

    const client = createClient({
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

    await client.close();
    await container.stop();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const customDatabase = "customDatabase";
    const container = await new ClickHouseContainer().withDatabase(customDatabase).start();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT currentDatabase() AS current_database",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ current_database: string }>;
    expect(data?.data?.[0]?.current_database).toBe(customDatabase);

    await client.close();
    await container.stop();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const customUsername = "customUsername";
    const container = await new ClickHouseContainer().withUsername(customUsername).start();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT currentUser() AS current_user",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ current_user: string }>;
    expect(data?.data?.[0]?.current_user).toBe(customUsername);

    await client.close();
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new ClickHouseContainer().start();
    await container.restart();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
    await container.stop();
  });
});
