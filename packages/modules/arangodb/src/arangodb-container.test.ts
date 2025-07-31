import { Database } from "arangojs";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ArangoDBContainer } from "./arangodb-container";

const IMAGE = getImage(__dirname);

describe("ArangoDBContainer", { timeout: 180_000 }, () => {
  it("should connect and return a query result", async () => {
    // example {
    await using container = await new ArangoDBContainer(IMAGE).start();

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
    // }
  });
});
