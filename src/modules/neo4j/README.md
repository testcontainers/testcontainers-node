# Neo4j

Neo4j is a highly scalable, robust native graph database.
Let's test it!

## Examples

Test with jest to create a person node in neo4j

```typescript
import neo4j, { Driver } from 'neo4j-driver'
import { Neo4jContainer, StartedNeo4jContainer } from 'testcontainers'

let container: StartedNeo4jContainer
let driver: Driver
let session: Session

beforeEach(async () => {
  container = await new Neo4jContainer().withApoc().start()
  driver = neo4j.driver(
    container.getBoltUri(),
    neo4j.auth.basic(container.getUsername(), container.getPassword())
  )
})

afterEach(async () => {
  await session?.close()
  await driver?.close()
  await container?.stop()
})

describe('neo4j', () => {
  jest.setTimeout(120000)

  test('connect', async () => {
    driver = await db()
    const serverInfo = await driver.verifyConnectivity()
    expect(serverInfo).toBeDefined()
  })

  test('create person', async () => {
    session = driver.session()
    const personName = 'Chris'

    const result = await session.run(
      'CREATE (a:Person {name: $name}) RETURN a',
      {
        name: personName,
      }
    )

    const singleRecord = result.records[0]
    const node = singleRecord.get(0)

    expect(node.properties.name).toBe(personName)
  })
})

```

Install APOC plugin:

```typescript
container = await new Neo4jContainer().withApoc().start();
  ```

Set custom password (by default the password is a random uuid):
```typescript
container = await new Neo4jContainer().withApoc().withPassword('super_secret').start();
```
## Contact
You miss something? 
Create an issue or write me on [twitter](https://twitter.com/ltwlf)