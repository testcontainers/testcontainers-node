import { Client } from "cassandra-driver"; // Scylla uses Cassandra's driver in Node.js
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ScyllaContainer } from "./scylladb-container";

const IMAGE = getImage(__dirname);

describe("ScyllaDB", { timeout: 240_000 }, () => {
  it("should connect and execute a query", async () => {
    // connectWithDefaultCredentials {
    await using container = await new ScyllaContainer(IMAGE).start();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
      keyspace: "system",
    });

    await client.connect();

    const result = await client.execute("SELECT cql_version FROM system.local");
    expect(result.rows[0].cql_version).toBe("3.3.1");

    await client.shutdown();
    // }
  });

  // createAndFetchData {
  it("should create keyspace, a table, insert data, and retrieve it", async () => {
    await using container = await new ScyllaContainer(IMAGE).start();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
    });

    await client.connect();

    // Create the keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS test_keyspace
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
    `);

    await client.execute("USE test_keyspace");

    // Create the table.
    await client.execute(`
      CREATE TABLE IF NOT EXISTS test_keyspace.users (
        id UUID PRIMARY KEY,
        name text
      )
    `);

    // Insert a record
    const id = "d002cd08-401a-47d6-92d7-bb4204d092f8"; // Fixed UUID for testing
    const username = "Test McTestinson";
    await client.execute("INSERT INTO test_keyspace.users (id, name) VALUES (?, ?)", [id, username]);

    // Fetch and verify the record
    const result = await client.execute("SELECT * FROM test_keyspace.users WHERE id = ?", [id], { prepare: true });
    expect(result.rows[0].name).toEqual(username);

    await client.shutdown();
  });
  // }

  it("should work with restarted container", async () => {
    await using container = await new ScyllaContainer(IMAGE).start();
    await container.restart();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
      keyspace: "system",
    });

    await client.connect();

    const result = await client.execute("SELECT cql_version FROM system.local");
    expect(result.rows[0].cql_version).toBe("3.3.1");

    await client.shutdown();
  });
});
