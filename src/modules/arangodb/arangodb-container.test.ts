import { Database } from "arangojs";
import { Config } from "arangojs/connection";
import { ArangoDBContainer, StartedArangoContainer } from "./arangodb-container";

describe("ArangoDB", () => {
  jest.setTimeout(180_000);

  let container: StartedArangoContainer;

  beforeEach(async () => {
    container = await new ArangoDBContainer().start();
  });

  afterEach(async () => {
    await container.stop();
  });

  it("should connect", async () => {
    const db = new Database({
      url: container.getHttpUrl(),
    } as Config);

    db.database("_system");
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
