import { createConnection } from "mysql2/promise";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MySqlContainer } from "./mysql-container";

const IMAGE = getImage(__dirname);

describe("MySqlContainer", { timeout: 240_000 }, () => {
  it("should connect and execute query", async () => {
    // mysqlConnect {
    await using container = await new MySqlContainer(IMAGE).start();

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
    // }
  });

  it("should work with database URI", async () => {
    // mysqlUriConnect {
    const username = "testUser";
    const password = "testPassword";
    const database = "testDB";

    await using container = await new MySqlContainer(IMAGE)
      .withUsername(username)
      .withUserPassword(password)
      .withDatabase(database)
      .start();

    expect(container.getConnectionUri()).toEqual(
      `mysql://${username}:${password}@${container.getHost()}:${container.getPort()}/${database}`
    );

    await using rootContainer = await new MySqlContainer(IMAGE)
      .withRootPassword(password)
      .withDatabase(database)
      .start();

    expect(rootContainer.getConnectionUri(true)).toEqual(
      `mysql://root:${password}@${rootContainer.getHost()}:${rootContainer.getPort()}/${database}`
    );
    // }
  });

  it("should set database", async () => {
    // mysqlSetDatabase {
    await using container = await new MySqlContainer(IMAGE).withDatabase("customDatabase").start();

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
    // }
  });

  // mysqlSetUsername {
  it("should set username", async () => {
    await using container = await new MySqlContainer(IMAGE).withUsername("customUsername").start();

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
  });
  // }

  it("should execute a query and return the result", async () => {
    // mysqlExecuteQuery {
    await using container = await new MySqlContainer(IMAGE).start();

    const result = await container.executeQuery("SELECT 1 as res");
    expect(result).toEqual(expect.stringContaining("res\n1\n"));
    // }
  });

  it("should execute a query as root user", async () => {
    await using container = await new MySqlContainer(IMAGE).withUsername("customUsername").start();

    // Test non-root user
    const queryResult = await container.executeQuery("SELECT CURRENT_USER() as user");
    expect(queryResult).toEqual(expect.stringContaining("user\ncustomUsername"));

    // Test root user
    const rootQueryResult = await container.executeQuery("SELECT CURRENT_USER() as user", [], true);
    expect(rootQueryResult).toEqual(expect.stringContaining("user\nroot"));
  });

  it("should work with restarted container", async () => {
    await using container = await new MySqlContainer(IMAGE).start();
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
  });
});
