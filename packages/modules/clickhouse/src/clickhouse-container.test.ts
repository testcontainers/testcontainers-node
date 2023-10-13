import { ClickhouseContainer, StartedClickhouseContainer } from "./clickhouse-container";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import path from "path";

const CONFIG_FILE_MODE = parseInt("0644", 8)

describe("ClickhouseContainer", () => {
  jest.setTimeout(240_000);

  it("should work with defaults", async () => {
    const container = await new ClickhouseContainer().start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  it("should work with custom credentials", async () => {
    const container = await new ClickhouseContainer()
      .withUsername(`un${(Math.random()*1000000) | 0}`)
      .withPassword(`pass${(Math.random()*1000000) | 0}`)
      .start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  it("should work with custom database and custom yaml config", async () => {
    const CONFIG_PATH_YAML = "/etc/clickhouse-server/config.d/config.yaml";
    const container = await new ClickhouseContainer()
      .withDatabase(`db${(Math.random()*1000000) | 0}`)
      .withPassword("")
      .withCopyFilesToContainer([{source: path.join("testdata", "config.yaml"), target: CONFIG_PATH_YAML, mode: CONFIG_FILE_MODE}])
      .start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  it("should work with custom image and custom xml config example", async () => {
    const CONFIG_PATH_XML = "/etc/clickhouse-server/config.d/config.xml";
    const container = await new ClickhouseContainer("23.8-alpine")
      .withPassword("")
      .withCopyFilesToContainer([{source: path.join("testdata", "config.xml"), target: CONFIG_PATH_XML, mode: CONFIG_FILE_MODE}])
      .start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  function createClickhouseContainerHttpClient(container: StartedClickhouseContainer) {
    return createClient({
      host: container.getHttpUrl("http"),
      username: container.getUsername(),
      password: container.getPassword(),
    });
  }

  async function _test(client: ClickHouseClient, db: string) {
    const tableName = 'array_json_each_row';
    await client.command({
      query: `DROP TABLE IF EXISTS ${db}.${tableName}`,
    });
    await client.command({
      query: `
        CREATE TABLE ${db}.${tableName}
        (id UInt64, name String)
        ENGINE MergeTree()
        ORDER BY (id)
      `,
    });
    await client.insert({
      table: `${db}.${tableName}`,
      values: [
        { id: 42, name: 'foo' },
        { id: 42, name: 'bar' },
      ],
      format: 'JSONEachRow',
    });
    const rows = await client.query({
      query: `SELECT * FROM ${db}.${tableName}`,
      format: 'JSONEachRow',
    });
    expect(await rows.json()).toEqual([{id:"42",name:"foo"},{id:"42",name:"bar"}]);   
  }
});
