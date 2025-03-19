import { createConnection } from "mysql2/promise";
import { MySqlContainer } from "./mysql-container";

describe("MySqlContainer", { timeout: 240_000 }, () => {
  // connect {
  it("should connect and execute query", async () => {
    const container = await new MySqlContainer().start();

    const client = await createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const [rows] = await client.execute("SELECT 1 as res");
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
    const container = await new MySqlContainer()
      .withUsername(username)
      .withUserPassword(password)
      .withDatabase(database)
      .start();
    expect(container.getConnectionUri()).toEqual(
      `mysql://${username}:${password}@${container.getHost()}:${container.getPort()}/${database}`
    );
    await container.stop();

    // Test root user
    const rootContainer = await new MySqlContainer().withRootPassword(password).withDatabase(database).start();
    expect(rootContainer.getConnectionUri(true)).toEqual(
      `mysql://root:${password}@${rootContainer.getHost()}:${rootContainer.getPort()}/${database}`
    );
    await rootContainer.stop();
  });
  // }

  // setDatabase {
  it("should set database", async () => {
    const container = await new MySqlContainer().withDatabase("customDatabase").start();

    const client = await createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const [rows] = await client.execute("SELECT DATABASE() as res");
    expect(rows).toEqual([{ res: "customDatabase" }]);

    await client.end();
    await container.stop();
  });
  // }

  // setUsername {
  it("should set username", async () => {
    const container = await new MySqlContainer().withUsername("customUsername").start();

    const client = await createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const [rows] = await client.execute("SELECT CURRENT_USER() as res");
    expect(rows).toEqual([{ res: "customUsername@%" }]);

    await client.end();
    await container.stop();
  });
  // }

  // executeQuery {
  it("should execute a query and return the result", async () => {
    const container = await new MySqlContainer().start();

    const queryResult = await container.executeQuery("SELECT 1 as res");
    expect(queryResult).toEqual(expect.stringContaining("res\n1\n"));

    await container.stop();
  });

  it("should execute a query as root user", async () => {
    const container = await new MySqlContainer().withUsername("customUsername").start();

    // Test non-root user
    const queryResult = await container.executeQuery("SELECT CURRENT_USER() as user");
    expect(queryResult).toEqual(expect.stringContaining("user\ncustomUsername"));

    // Test root user
    const rootQueryResult = await container.executeQuery("SELECT CURRENT_USER() as user", [], true);
    expect(rootQueryResult).toEqual(expect.stringContaining("user\nroot"));

    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new MySqlContainer().start();
    await container.restart();

    const client = await createConnection({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getUserPassword(),
    });

    const [rows] = await client.execute("SELECT 1 as res");
    expect(rows).toEqual([{ res: 1 }]);

    await client.end();
    await container.stop();
  });
});
