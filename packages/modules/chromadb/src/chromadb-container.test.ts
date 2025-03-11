import { AdminClient, ChromaClient } from "chromadb";
import { ChromaDBContainer } from "./chromadb-container";

describe("ChromaDB", { timeout: 360_000 }, () => {
  // docs {
  it("should connect and return a query result", async () => {
    const container = await new ChromaDBContainer().start();
    const tenant = "test-tenant";
    const key = "test-key";
    const database = "test-db";
    const adminClient = new AdminClient({
      tenant: tenant,
      auth: {
        provider: "token",
        credentials: key,
        providerOptions: {
          headerType: "X_CHROMA_TOKEN",
        },
      },
      path: container.getHttpUrl(),
    });

    await adminClient.createTenant({ name: tenant });
    await adminClient.createDatabase({ name: database, tenantName: tenant });

    const dbClient = new ChromaClient({
      tenant,
      auth: {
        provider: "token",
        credentials: key,
        providerOptions: {
          headerType: "X_CHROMA_TOKEN",
        },
      },
      path: container.getHttpUrl(),
      database,
    });

    const collection = await dbClient.createCollection({ name: "test-collection" });

    await collection.add({
      ids: ["1", "2", "3"],
      documents: ["apple", "oranges", "pineapple"],
      embeddings: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    });

    const result = await collection.get({ ids: ["1", "2", "3"] });

    expect(result).toMatchInlineSnapshot(`
      {
        "data": null,
        "documents": [
          "apple",
          "oranges",
          "pineapple",
        ],
        "embeddings": null,
        "ids": [
          "1",
          "2",
          "3",
        ],
        "metadatas": [
          null,
          null,
          null,
        ],
        "uris": null,
      }
    `);

    await container.stop();
  });
  // }
});
