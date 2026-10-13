import { Client } from "@elastic/elasticsearch";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ElasticsearchContainer } from "./elasticsearch-container";

const IMAGES = ["elasticsearch:8.19.23", getImage(__dirname)];

describe.each(IMAGES)("ElasticsearchContainer (%s)", { timeout: 180_000 }, (image) => {
  it("should create an index", async () => {
    // createIndex {
    await using container = await new ElasticsearchContainer(image).start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
    // }
  });

  // The 9.x client sends a compatible-with=9 media type with request bodies, which Elasticsearch 8 rejects.
  it.skipIf(image.startsWith("elasticsearch:8."))("should index a document", async () => {
    // indexDocument {
    await using container = await new ElasticsearchContainer(image).start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    const document = {
      id: "1",
      name: "John Doe",
    };
    await client.index({
      index: "people",
      id: document.id,
      document,
    });

    expect((await client.get({ index: "people", id: document.id }))._source).toStrictEqual(document);
    // }
  });

  it("should set custom password", async () => {
    // withPassword {
    await using container = await new ElasticsearchContainer(image).withPassword("testPassword").start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });
    // }

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
  });

  it("should work with restarted container", async () => {
    await using container = await new ElasticsearchContainer(image).start();
    await container.restart();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
  }); // }
});
