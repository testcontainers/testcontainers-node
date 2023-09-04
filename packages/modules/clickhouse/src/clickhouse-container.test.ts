import { ClickhouseContainer, StartedClickhouseContainer } from "./clickhouse-container";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import path from "path";

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


  it("should work with custom database", async () => {
    const container = await new ClickhouseContainer()
      .withDatabase(`db${(Math.random()*1000000) | 0}`)
      .start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  it("should work with custom image", async () => {
    const container = await new ClickhouseContainer("23.8-alpine").start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  it("should work with custom xml config", async () => {
    const container = await new ClickhouseContainer()
      .withPassword("")
      .withXmlConfigFile(path.join("testdata", "config.xml"))
      .start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });

  it("should work with custom yaml config", async () => {
    const container = await new ClickhouseContainer()
      .withPassword("")
      .withXmlConfigFile(path.join("testdata", "config.yaml"))
      .start();
    const client = createClickhouseContainerHttpClient(container);
    await _test(client, container.getDatabase());
    await client.close();
    await container.stop();
  });
  
  function createClickhouseContainerHttpClient(container: StartedClickhouseContainer) {
    return createClient({
      host: `http://${container.getHost()}:${container.getHostPorts().http}`,
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
