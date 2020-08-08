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
  container.getBoltUri(),
  neo4j.auth.basic(container.getUsername(), container.getPassword())
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
```

Install APOC plugin:

```typescript
container = await new Neo4jContainer().withApoc().start();
  ```

Set custom password

```typescript
container = await new Neo4jContainer().withApoc().start();
  ```
