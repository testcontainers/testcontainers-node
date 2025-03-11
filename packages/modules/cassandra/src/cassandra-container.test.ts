import { Client } from "cassandra-driver";
import { CassandraContainer } from "./cassandra-container";

describe("Cassandra", { timeout: 240_000 }, () => {
  // connectWithDefaultCredentials {
  it("should connect and execute a query with default credentials", async () => {
    const container = await new CassandraContainer("cassandra:5.0.2").start();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
      keyspace: "system",
    });

    await client.connect();

    const result = await client.execute("SELECT release_version FROM system.local");
    expect(result.rows[0].release_version).toBe("5.0.2");

    await client.shutdown();
    await container.stop();
  });
  // }

  // connectWithCustomCredentials {
  it("should connect with custom username and password", async () => {
    const username = "testUser";
    const password = "testPassword";

    const container = await new CassandraContainer().withUsername(username).withPassword(password).start();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
      credentials: { username, password },
      keyspace: "system",
    });

    await client.connect();

    const result = await client.execute("SELECT release_version FROM system.local");
    expect(result.rows.length).toBeGreaterThan(0);

    await client.shutdown();
    await container.stop();
  });
  // }

  // customDataSenterAndRack {
  it("should set datacenter and rack", async () => {
    const customDataCenter = "customDC";
    const customRack = "customRack";
    const container = await new CassandraContainer().withDatacenter(customDataCenter).withRack(customRack).start();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
    });

    await client.connect();
    const result = await client.execute("SELECT data_center, rack FROM system.local");
    expect(result.rows[0].data_center).toBe(customDataCenter);
    expect(result.rows[0].rack).toBe(customRack);

    await client.shutdown();
    await container.stop();
  });
  // }

  // createAndFetchData {
  it("should create keyspace, a table, insert data, and retrieve it", async () => {
    const container = await new CassandraContainer().start();

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
    const username = "Testy McTesterson";
    client.execute("INSERT INTO test_keyspace.users (id, name) VALUES (?, ?)", [id, username]);

    // Fetch and verify the record
    const result = await client.execute("SELECT * FROM test_keyspace.users WHERE id = ?", [id], { prepare: true });
    expect(result.rows[0].name).toBe(username);

    await client.shutdown();
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new CassandraContainer("cassandra:5.0.2").start();
    await container.restart();

    const client = new Client({
      contactPoints: [container.getContactPoint()],
      localDataCenter: container.getDatacenter(),
      keyspace: "system",
    });

    await client.connect();

    const result = await client.execute("SELECT release_version FROM system.local");
    expect(result.rows[0].release_version).toBe("5.0.2");

    await client.shutdown();
    await container.stop();
  });
});
