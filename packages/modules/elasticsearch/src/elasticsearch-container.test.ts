import { ElasticsearchContainer } from "./elasticsearch-container";
import { Client } from "@elastic/elasticsearch";

describe("ElasticsearchContainer", () => {
  jest.setTimeout(180_000);

  // createIndex {
  it("should allow creating an index", async () => {
    const container = await new ElasticsearchContainer().start();
    const client = new Client({ node: container.getHttpUrl() });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toEqual(true);
    await container.stop();
  });
  // }

  // indexDocument {
  it("should allow indexing the document", async () => {
    const container = await new ElasticsearchContainer().start();
    const client = new Client({ node: container.getHttpUrl() });

    const document = {
      id: "1",
      name: "John Doe",
    };
    await client.index({
      index: "people",
      document,
      id: document.id,
    });

    expect((await client.get({ index: "people", id: document.id }))._source).toStrictEqual(document);
    await container.stop();
  });
  // }
});
