import { Client } from "pg";
import { PostgreSqlContainer } from "./postgresql-container";

describe("PostgreSqlContainer", { timeout: 180_000 }, () => {
  // connect {
  it("should connect and return a query result", async () => {
    const container = await new PostgreSqlContainer().start();

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
    await container.stop();
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const container = await new PostgreSqlContainer().start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    const result = await client.query("SELECT 1");
    expect(result.rows[0]).toEqual({ "?column?": 1 });

    await client.end();
    await container.stop();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const container = await new PostgreSqlContainer().withDatabase("customDatabase").start();

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
    await container.stop();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const container = await new PostgreSqlContainer().withUsername("customUsername").start();

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
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new PostgreSqlContainer().start();
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
    await container.stop();
  });

  it("should allow custom healthcheck", async () => {
    const container = new PostgreSqlContainer().withHealthCheck({
      test: ["CMD-SHELL", "exit 1"],
      interval: 100,
      retries: 0,
      timeout: 0,
    });

    await expect(() => container.start()).rejects.toThrow();
  });
});

describe("PostgreSqlContainer snapshot and restore", { timeout: 180_000 }, () => {
  // createAndRestoreFromSnapshot {
  it("should create and restore from snapshot", async () => {
    const container = await new PostgreSqlContainer().start();

    // Connect to the database
    let client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Create some test data
    await client.query("CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT)");
    await client.query("INSERT INTO test_table (name) VALUES ('initial data')");

    // Close connection before snapshot (otherwise we'll get an error because user is already connected)
    await client.end();

    // Take a snapshot
    await container.snapshot();

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Modify the database
    await client.query("INSERT INTO test_table (name) VALUES ('data after snapshot')");

    // Verify both records exist
    let result = await client.query("SELECT * FROM test_table ORDER BY id");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toEqual("initial data");
    expect(result.rows[1].name).toEqual("data after snapshot");

    // Close connection before restore (same reason as above)
    await client.end();

    // Restore to the snapshot
    await container.restore();

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Verify only the initial data exists after restore
    result = await client.query("SELECT * FROM test_table ORDER BY id");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toEqual("initial data");

    await client.end();
    await container.stop();
  });
  // }

  it("should use custom snapshot name", async () => {
    const container = await new PostgreSqlContainer().start();
    const customSnapshotName = "my_custom_snapshot";

    // Connect to the database
    let client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Create a test table and insert data
    await client.query("CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT)");
    await client.query("INSERT INTO test_table (name) VALUES ('initial data')");

    // Close connection before snapshot
    await client.end();

    // Take a snapshot with custom name
    await container.snapshot(customSnapshotName);

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Modify the database
    await client.query("INSERT INTO test_table (name) VALUES ('data after snapshot')");

    // Close connection before restore
    await client.end();

    // Restore using the custom snapshot name
    await container.restore(customSnapshotName);

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Verify only the initial data exists after restore
    const result = await client.query("SELECT * FROM test_table ORDER BY id");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toEqual("initial data");

    await client.end();
    await container.stop();
  });

  it("should handle multiple snapshots", async () => {
    const container = await new PostgreSqlContainer().start();

    // Connect to the database
    let client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Create a test table
    await client.query("CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT)");

    // Close connection before snapshot
    await client.end();

    // Take first snapshot with empty table
    await container.snapshot("snapshot1");

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Add first record
    await client.query("INSERT INTO test_table (name) VALUES ('data for snapshot 2')");

    // Close connection before snapshot
    await client.end();

    // Take second snapshot with one record
    await container.snapshot("snapshot2");

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Add second record
    await client.query("INSERT INTO test_table (name) VALUES ('data after snapshots')");

    // Verify we have two records
    let result = await client.query("SELECT COUNT(*) as count FROM test_table");
    expect(result.rows[0].count).toEqual("2");

    // Close connection before restore
    await client.end();

    // Restore to first snapshot (empty table)
    await container.restore("snapshot1");

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Verify table is empty
    result = await client.query("SELECT COUNT(*) as count FROM test_table");
    expect(result.rows[0].count).toEqual("0");

    // Close connection before restore
    await client.end();

    // Restore to second snapshot (one record)
    await container.restore("snapshot2");

    // Reconnect to database
    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();

    // Verify we have one record
    result = await client.query("SELECT * FROM test_table");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toEqual("data for snapshot 2");

    await client.end();
    await container.stop();
  });

  it("should throw an error when trying to snapshot postgres system database", async () => {
    const container = await new PostgreSqlContainer().withDatabase("postgres").start();

    await expect(container.snapshot()).rejects.toThrow(
      "Cannot restore the postgres system database as it cannot be dropped to be restored"
    );

    await expect(container.restore()).rejects.toThrow(
      "Cannot restore the postgres system database as it cannot be dropped to be restored"
    );

    await container.stop();
  });
});
