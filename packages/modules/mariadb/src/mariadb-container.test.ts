import mariadb from "mariadb";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MariaDbContainer } from "./mariadb-container";

const IMAGE = getImage(__dirname);

describe("MariaDb", { timeout: 240_000 }, () => {
  // connect {
  it("should connect and execute query", async () => {
    await using container = await new MariaDbContainer(IMAGE).start();

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
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const username = "testUser";
    const password = "testPassword";
    const database = "testDB";

    // Test non-root user
    await using container = await new MariaDbContainer(IMAGE)
      .withUsername(username)
      .withUserPassword(password)
      .withDatabase(database)
      .start();
    expect(container.getConnectionUri()).toEqual(
      `mariadb://${username}:${password}@${container.getHost()}:${container.getPort()}/${database}`
    );

    // Test root user
    await using rootContainer = await new MariaDbContainer(IMAGE)
      .withRootPassword(password)
      .withDatabase(database)
      .start();
    expect(rootContainer.getConnectionUri(true)).toEqual(
      `mariadb://root:${password}@${rootContainer.getHost()}:${rootContainer.getPort()}/${database}`
    );
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    await using container = await new MariaDbContainer(IMAGE).withDatabase("customDatabase").start();

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
  });
  // }

  // setUsername {
  it("should set username", async () => {
    await using container = await new MariaDbContainer(IMAGE).withUsername("customUsername").start();

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
  });
  // }

  // insertAndFetchData {
  it("should create a table, insert a row, and fetch that row", async () => {
    await using container = await new MariaDbContainer(IMAGE).start();

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
  });
  // }

  it("should work with restarted container", async () => {
    await using container = await new MariaDbContainer(IMAGE).start();
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
  });
});
