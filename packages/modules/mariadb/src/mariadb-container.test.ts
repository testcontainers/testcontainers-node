import mariadb from "mariadb";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MariaDbContainer } from "./mariadb-container";

const IMAGE = getImage(__dirname);

describe("MariaDbContainer", { timeout: 240_000 }, () => {
  it("should connect and execute query", async () => {
    // mariaDbConnect {
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
    // }
  });

  it("should work with database URI", async () => {
    // mariaDbUriConnect {
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
    // }
  });

  it("should set database", async () => {
    // mariaDbSetDatabase {
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
    // }
  });

  it("should set username", async () => {
    // mariaDbSetUsername {
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
    // }
  });

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
