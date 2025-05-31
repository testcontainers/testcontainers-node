import neo4j from "neo4j-driver";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { Neo4jContainer, Neo4jPlugin } from "./neo4j-container";

const IMAGE = getImage(__dirname);

describe("Neo4jContainer", { timeout: 180_000 }, () => {
  // createNode {
  it("should create a person node", async () => {
    const container = await new Neo4jContainer(IMAGE).start();
    const driver = neo4j.driver(
      container.getBoltUri(),
      neo4j.auth.basic(container.getUsername(), container.getPassword())
    );

    const session = driver.session();
    const personName = "Chris";
    const result = await session.run("CREATE (a:Person {name: $name}) RETURN a", { name: personName });
    const singleRecord = result.records[0];
    const node = singleRecord.get(0);
    expect(node.properties.name).toBe(personName);

    await session.close();
    await driver.close();
    await container.stop();
  });
  // }

  // v5DefaultPassword {
  it("should connect to neo4j:v5 with default password", async () => {
    const container = await new Neo4jContainer("neo4j:5.23.0").start();
    const driver = neo4j.driver(
      container.getBoltUri(),
      neo4j.auth.basic(container.getUsername(), container.getPassword())
    );

    const session = driver.session();
    const personName = "Chris";
    const result = await session.run("CREATE (a:Person {name: $name}) RETURN a", { name: personName });
    const singleRecord = result.records[0];
    const node = singleRecord.get(0);
    expect(node.properties.name).toBe(personName);

    await session.close();
    await driver.close();
    await container.stop();
  });
  // }

  // setPassword {
  it("should connect with custom password", async () => {
    const container = await new Neo4jContainer(IMAGE).withPassword("xyz1234@!").start();
    const driver = neo4j.driver(
      container.getBoltUri(),
      neo4j.auth.basic(container.getUsername(), container.getPassword())
    );

    const session = driver.session();
    const personName = "Chris";
    const result = await session.run("CREATE (a:Person {name: $name}) RETURN a", { name: personName });
    const singleRecord = result.records[0];
    const node = singleRecord.get(0);
    expect(node.properties.name).toBe(personName);

    await session.close();
    await driver.close();
    await container.stop();
  });
  // }

  // apoc {
  it("should have APOC plugin installed", async () => {
    const container = await new Neo4jContainer(IMAGE).withApoc().withStartupTimeout(120_000).start();
    const driver = neo4j.driver(
      container.getBoltUri(),
      neo4j.auth.basic(container.getUsername(), container.getPassword())
    );

    const session = driver.session();
    const result = await session.run("CALL apoc.help('text')");
    const singleRecord = result.records[0];
    expect(singleRecord.length).toBeGreaterThan(0);

    await session.close();
    await driver.close();
    await container.stop();
  });
  // }

  // pluginsList {
  it("should work with plugin list", async () => {
    const container = await new Neo4jContainer("neo4j:5.26.5")
      .withPlugins([Neo4jPlugin.APOC_EXTENDED, Neo4jPlugin.GRAPH_DATA_SCIENCE])
      .withStartupTimeout(120_000)
      .start();
    const driver = neo4j.driver(
      container.getBoltUri(),
      neo4j.auth.basic(container.getUsername(), container.getPassword())
    );

    const session = driver.session();

    // Monitor methods are only available in extended Apoc.
    const result = await session.run("CALL apoc.monitor.ids()");
    expect(result.records[0].get("nodeIds")).toEqual({ high: 0, low: 0 });

    // Insert one node.
    await session.run("CREATE (a:Person {name: $name}) RETURN a", { name: "Some dude" });

    // Monitor result should reflect increase in data.
    const result2 = await session.run("CALL apoc.monitor.ids()");
    expect(result2.records[0].get("nodeIds")).toEqual({ high: 0, low: 1 });

    await session.close();
    await driver.close();
    await container.stop();
  });
  // }
});
