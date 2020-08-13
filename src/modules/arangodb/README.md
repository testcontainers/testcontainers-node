# ArangoDB

ArangoDB is an open source frienly multi-model database.

## Examples

Jest test to verify the connection

```typescript
import { Database } from "arangojs";
import { ArangoDBContainer, StartedArangoContainer } from "./arangodb-container";
import { Config } from "arangojs/lib/cjs/connection";

describe("ArangoDB", () => {
  jest.setTimeout(120000);

  let container: StartedArangoContainer;

  beforeEach(async () => {
    container = await new ArangoDBContainer().start();
  });

  afterEach(async () => {
    container.stop();
  });

  it("should connect", async () => {
    const db = new Database({
      url: container.getHttpUrl(),
    } as Config);

    db.useDatabase("_system");
    db.useBasicAuth(container.getUsername(), container.getPassword());

    const value = "Hello ArangoDB!";

    const result = await db.query({
      query: "RETURN @value",
      bindVars: { value },
    });
    const returnValue = await result.next();
    expect(returnValue).toBe(value);
  });
});

```


```
## Contact
You miss something? 
Create an issue or write me on [twitter](https://twitter.com/ltwlf)