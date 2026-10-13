import { createConnection } from "mariadb";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MariaDbContainer } from "./mariadb-container";

const IMAGES = ["mariadb:10.11.19", "mariadb:11.8.9", "mariadb:12.3.3", getImage(__dirname)];

describe.each(IMAGES)("MariaDbContainer (%s)", { concurrent: false, timeout: 240_000 }, (image) => {
  it.concurrent("should connect and execute query", async () => {
    // mariaDbConnect {
    await using container = await new MariaDbContainer(image).start();

    const client = await createConnection({
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

  it.concurrent("should work with database URI", async () => {
    // mariaDbUriConnect {
    const username = "testUser";
    const password = "testPassword";
    const database = "testDB";

    // Test non-root user
    await using container = await new MariaDbContainer(image)
      .withUsername(username)
      .withUserPassword(password)
      .withDatabase(database)
      .start();

    expect(container.getConnectionUri()).toEqual(
      `mariadb://${username}:${password}@${container.getHost()}:${container.getPort()}/${database}`
    );

    // Test root user
    await using rootContainer = await new MariaDbContainer(image)
      .withRootPassword(password)
      .withDatabase(database)
      .start();

    expect(rootContainer.getConnectionUri(true)).toEqual(
      `mariadb://root:${password}@${rootContainer.getHost()}:${rootContainer.getPort()}/${database}`
    );
    // }
  });

  it.concurrent("should set database", async () => {
    // mariaDbSetDatabase {
    await using container = await new MariaDbContainer(image).withDatabase("customDatabase").start();

    const client = await createConnection({
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

  it.concurrent("should set username", async () => {
    // mariaDbSetUsername {
    await using container = await new MariaDbContainer(image).withUsername("customUsername").start();

    const client = await createConnection({
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

  it.concurrent("should work with restarted container", async () => {
    await using container = await new MariaDbContainer(image).start();
    await container.restart();

    const client = await createConnection({
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
