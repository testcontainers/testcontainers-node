import mariadb from "mariadb";
import { MariaDbContainer } from "./mariadb-container";

describe("MariaDb", { timeout: 240_000 }, () => {
  // connect {
  it("should connect and execute query", async () => {
    const container = await new MariaDbContainer().start();

    const client = await mariadb.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const rows = await client.query("SELECT 1 as res");
    expect(rows).toEqual([{ res: 1 }]);

    await client.end();
    await container.stop();
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const username = "testUser";
    const password = "testPassword";
    const database = "testDB";

    // Test non-root user
    const container = await new MariaDbContainer()
      .withUsername(username)
      .withUserPassword(password)
      .withDatabase(database)
      .start();
    expect(container.getConnectionUri()).toEqual(
      `mariadb://${username}:${password}@${container.getHost()}:${container.getPort()}/${database}`
    );
    await container.stop();

    // Test root user
    const rootContainer = await new MariaDbContainer().withRootPassword(password).withDatabase(database).start();
    expect(rootContainer.getConnectionUri(true)).toEqual(
      `mariadb://root:${password}@${rootContainer.getHost()}:${rootContainer.getPort()}/${database}`
    );
    await rootContainer.stop();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const container = await new MariaDbContainer().withDatabase("customDatabase").start();

    const client = await mariadb.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const rows = await client.query("SELECT DATABASE() as res");
    expect(rows).toEqual([{ res: "customDatabase" }]);

    await client.end();
    await container.stop();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const container = await new MariaDbContainer().withUsername("customUsername").start();

    const client = await mariadb.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const rows = await client.query("SELECT CURRENT_USER() as res");
    expect(rows).toEqual([{ res: "customUsername@%" }]);

    await client.end();
    await container.stop();
  });
  // }

  // insertAndFetchData {
  it("should create a table, insert a row, and fetch that row", async () => {
    const container = await new MariaDbContainer().start();

    const client = await mariadb.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    // Create table
    await client.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE
        );
      `);

    // Insert a row
    const name = "John Doe";
    const email = "john.doe@example.com";
    const insertResult = await client.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    expect(insertResult.affectedRows).toBe(1);

    // Fetch the row
    const [user] = await client.query("SELECT id, name, email FROM users WHERE email = ?", [email]);
    expect(user).toEqual({ id: expect.any(Number), name, email });

    await client.end();
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new MariaDbContainer().start();
    await container.restart();

    const client = await mariadb.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const rows = await client.query("SELECT 1 as res");
    expect(rows).toEqual([{ res: 1 }]);

    await client.end();
    await container.stop();
  });
});
