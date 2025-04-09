import { ClickHouseClient, createClient } from "@clickhouse/client";
import { ClickHouseContainer } from "./clickhouse-container";

describe("ClickHouseContainer", { timeout: 180_000 }, () => {
  const sleep = async (waitTime: number) => new Promise((resolve) => setTimeout(resolve, waitTime));

  // httpConnect {
  it("should connect and return a query result", async () => {
    const container = await new ClickHouseContainer().start();
    let client: ClickHouseClient | undefined;
    console.log("container.getConnectionUri()", container.getConnectionUri());
    // console.log("container.getHttpConnectionUri()", container.getHttpConnectionUri());
    try {
      //   client = createClient({
      //     url: container.getHttpConnectionUri(),
      //     database: container.getDatabase(),
      //     username: container.getUsername(),
      //     password: container.getPassword(),
      //     request_timeout: 100000,
      //   });

      client = createClient({
        url: container.getConnectionUri(),
      });

      console.error("Created client");

      const result = await client.query({
        query: "SELECT 1 AS value",
        format: "JSON",
      });
      const data = (await result.json()) as any;
      expect(data?.data?.[0]?.value).toBe(1);
    } finally {
      await client?.close();
      await container.stop();
    }
  });
  // }

  //   // connect {
  //   it("should work with database URI", async () => {
  //     const container = await new ClickHouseContainer().start();
  //     let client: ClickHouseClient | undefined;

  //     try {
  //       client = createClient({
  //         url: container.getConnectionUri(),
  //       });

  //       await client.ping();

  //       const result = await client.query({
  //         query: "SELECT 1 AS value",
  //         format: "JSON",
  //       });

  //       const data = (await result.json()) as any;
  //       expect(data?.data?.[0]?.value).toBe(1);
  //     } finally {
  //       await client?.close();
  //       await container.stop();
  //     }
  //   });
  //   // }

  //   // setDatabase {
  //   it("should set database", async () => {
  //     const customDatabase = "customDatabase";
  //     const container = await new ClickHouseContainer().withDatabase(customDatabase).start();

  //     let client: ClickHouseClient | undefined;

  //     try {
  //       client = createClient({
  //         url: container.getConnectionUri(),
  //       });

  //       await client.ping();

  //       const result = await client.query({
  //         query: "SELECT currentDatabase() AS current_database",
  //         format: "JSON",
  //       });

  //       const data = (await result.json()) as any;
  //       expect(data?.data?.[0]?.current_database).toBe(customDatabase);
  //     } finally {
  //       await client?.close();
  //       await container.stop();
  //     }
  //   });
  //   // }

  //   // setUsername {
  //   it("should set username", async () => {
  //     const customUsername = "customUsername";
  //     const container = await new ClickHouseContainer().withUsername(customUsername).start();

  //     let client: ClickHouseClient | undefined;

  //     try {
  //       client = createClient({
  //         url: container.getConnectionUri(),
  //       });

  //       await client.ping();

  //       const result = await client.query({
  //         query: "SELECT currentUser() AS current_user",
  //         format: "JSON",
  //       });

  //       const data = (await result.json()) as any;
  //       expect(data?.data?.[0]?.current_user).toBe(customUsername);
  //     } finally {
  //       await client?.close();
  //       await container.stop();
  //     }
  //   });
  //   // }

  //   it("should work with restarted container", async () => {
  //     const container = await new ClickHouseContainer().start();
  //     await container.restart();

  //     let client: ClickHouseClient | undefined;
  //     try {
  //       client = createClient({
  //         url: container.getConnectionUri(),
  //       });

  //       await client.ping();

  //       const result = await client.query({
  //         query: "SELECT 1 AS value",
  //         format: "JSON",
  //       });

  //       const data = (await result.json()) as any;
  //       expect(data?.data?.[0]?.value).toBe(1);
  //     } finally {
  //       await client?.close();
  //       await container.stop();
  //     }
  //   });

  //   it("should allow custom healthcheck", async () => {
  //     const container = new ClickHouseContainer().withHealthCheck({
  //       test: ["CMD-SHELL", "exit 1"],
  //       interval: 100,
  //       retries: 0,
  //       timeout: 100,
  //     });

  //     await expect(() => container.start()).rejects.toThrow();
  //   });
});
