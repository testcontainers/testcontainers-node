import neo4j from "neo4j-driver";
import { Neo4jContainer } from "./neo4j-container";

describe("Neo4jContainer", () => {
  jest.setTimeout(120000);

  it("should create a person node", async () => {
    const container = await new Neo4jContainer().start();

    const driver = neo4j.driver(
      "bolt://localhost:" + container.getMappedPort(Neo4jContainer.defaultBoltPort),
      neo4j.auth.basic(Neo4jContainer.defaultUserName, Neo4jContainer.defaultPassword)
    );

    const session = driver.session();
    const personName = "Chris";

    try {
      const result = await session.run("CREATE (a:Person {name: $name}) RETURN a", { name: personName });

      const singleRecord = result.records[0];
      const node = singleRecord.get(0);

      expect(node.properties.name).toBe(personName);
    } finally {
      await session.close();
      await driver.close();
      await container.stop();
    }
  });

  it("with custom user", async () => {
    const password = "customPassword";
    const container = await new Neo4jContainer().withPassword(password).start();

    const driver = neo4j.driver(
      "bolt://localhost:" + container.getMappedPort(Neo4jContainer.defaultBoltPort),
      neo4j.auth.basic(Neo4jContainer.defaultUserName, password)
    );

    const session = driver.session();
    const personName = "Chris";

    try {
      const result = await session.run("CREATE (a:Person {name: $name}) RETURN a", { name: personName });

      const singleRecord = result.records[0];
      const node = singleRecord.get(0);

      expect(node.properties.name).toBe(personName);
    } finally {
      await session.close();
      await driver.close();
      await container.stop();
    }
  });
});
