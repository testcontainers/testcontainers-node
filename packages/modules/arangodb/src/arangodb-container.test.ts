import { Database } from "arangojs";
import { ArangoDBContainer } from "./arangodb-container";

describe("ArangoDB", { timeout: 180_000 }, () => {
  // connect {
  it("should connect and return a query result", async () => {
    const container = await new ArangoDBContainer().start();
    const db = new Database({ url: container.getHttpUrl() });

    db.database("_system");
    db.useBasicAuth(container.getUsername(), container.getPassword());

    const value = "Hello ArangoDB!";
    const result = await db.query({
      query: "RETURN @value",
      bindVars: { value },
    });
    const returnValue = await result.next();
    expect(returnValue).toBe(value);

    await container.stop();
  });
  // }
});
