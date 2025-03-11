import { Client } from "@elastic/elasticsearch";
import { ElasticsearchContainer } from "./elasticsearch-container";

describe("ElasticsearchContainer", { timeout: 180_000 }, () => {
  // createIndex {
  it("should create an index", async () => {
    const container = await new ElasticsearchContainer().start();
    const client = new Client({ node: container.getHttpUrl() });

    await client.indices.create({ index: "people" });

    expect((await client.indices.exists({ index: "people" })).statusCode).toBe(200);
    await container.stop();
  });
  // }

  // indexDocument {
  it("should index a document", async () => {
    const container = await new ElasticsearchContainer().start();
    const client = new Client({ node: container.getHttpUrl() });

    const document = {
      id: "1",
      name: "John Doe",
    };
    await client.index({
      index: "people",
      body: document,
      id: document.id,
    });

    expect((await client.get({ index: "people", id: document.id })).body._source).toStrictEqual(document);
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new ElasticsearchContainer().start();
    await container.restart();

    const client = new Client({ node: container.getHttpUrl() });

    await client.indices.create({ index: "people" });

    expect((await client.indices.exists({ index: "people" })).statusCode).toBe(200);
    await container.stop();
  });
});
