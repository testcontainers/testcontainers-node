import { ElasticsearchContainer, StartedElasticsearchContainer } from "./elasticsearch-container";
import { Client } from "@elastic/elasticsearch";

describe("ElasticsearchContainer", () => {
  jest.setTimeout(180_000);
  let container: StartedElasticsearchContainer;
  beforeAll(async () => {
    container = await new ElasticsearchContainer().start();
  });

  it("should connect to http node of elasticsearch instance and create an index", async () => {
    const client = new Client({
      node: container.getHttpUrl(),
    });

    await client.indices.create({ index: "people" });

    expect((await client.indices.exists({ index: "people" })).statusCode).toBe(200);
  });

  it("should index a document in elasticsearch", async () => {
    const client = new Client({
      node: container.getHttpUrl(),
    });

    const document = {
      id: "1",
      name: "John Doe",
    };

    await client.index({
      index: "people",
      body: document,
      id: document.id,
    });

    expect(
      (
        await client.get({
          index: "people",
          id: document.id,
        })
      ).body._source
    ).toStrictEqual(document);
  });

  afterAll(async () => {
    await container.stop();
  });
});
