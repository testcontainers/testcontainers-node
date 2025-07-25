import { createClient } from "@clickhouse/client";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ClickHouseContainer } from "./clickhouse-container";

const IMAGE = getImage(__dirname);

interface ClickHouseQueryResponse<T> {
  data: T[];
}

describe("ClickHouseContainer", { timeout: 180_000 }, () => {
  it("should connect using the client options object", async () => {
    // connectWithOptions {
    await using container = await new ClickHouseContainer(IMAGE).start();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });
    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;

    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
    // }
  });

  it("should connect using the URL", async () => {
    // connectWithUrl {
    await using container = await new ClickHouseContainer(IMAGE).start();

    const client = createClient({
      url: container.getConnectionUrl(),
    });
    // }

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });
    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;

    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });

  it("should connect using the username and password", async () => {
    // connectWithUsernameAndPassword {
    await using container = await new ClickHouseContainer(IMAGE)
      .withUsername("customUsername")
      .withPassword("customPassword")
      .start();

    const client = createClient({
      url: container.getHttpUrl(),
      username: container.getUsername(),
      password: container.getPassword(),
    });
    // }

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });
    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;

    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });

  it("should set database", async () => {
    // setDatabase {
    const db = "customDatabase";
    await using container = await new ClickHouseContainer(IMAGE).withDatabase(db).start();
    // }

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT currentDatabase() AS current_database",
      format: "JSON",
    });
    const data = (await result.json()) as ClickHouseQueryResponse<{ current_database: string }>;

    expect(data?.data?.[0]?.current_database).toBe(db);

    await client.close();
  });

  it("should work with restarted container", async () => {
    await using container = await new ClickHouseContainer(IMAGE).start();
    await container.restart();

    const client = createClient(container.getClientOptions());

    const result = await client.query({
      query: "SELECT 1 AS value",
      format: "JSON",
    });

    const data = (await result.json()) as ClickHouseQueryResponse<{ value: number }>;
    expect(data?.data?.[0]?.value).toBe(1);

    await client.close();
  });
});
