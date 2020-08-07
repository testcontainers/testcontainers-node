# neo4j

Neo4j is a highly scalable, robust native graph database.
Let's test it!

## Examples

Start a neo4j container and create a person node

```typescript
import neo4j from "neo4j-driver";
import { Neo4jContainer } from "testcontainers";

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

  console.log(node.properties.name);

} finally {
  await session.close();
  await driver.close();
  await container.stop();
}
```

Example installing APOC plugin and enabling ttl.

```typescript
import neo4j from "neo4j-driver";

container = await new Neo4jContainer()
  .withEnv("NEO4JLABS_PLUGINS","[\"apoc\"]")
  .withEnv("NEO4J_apoc_ttl_enabled","true")
  .withPassword("124213")
  .start();

  ```
