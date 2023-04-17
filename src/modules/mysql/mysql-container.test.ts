import { createConnection } from "mysql2/promise";
import { MySqlContainer } from "./mysql-container";

describe("MySqlContainer", () => {
  jest.setTimeout(180_000);

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
  // }
});
