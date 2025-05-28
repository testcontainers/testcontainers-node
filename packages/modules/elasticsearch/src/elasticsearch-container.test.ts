import { Client } from "@elastic/elasticsearch";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ElasticsearchContainer } from "./elasticsearch-container";

const IMAGE = getImage(__dirname);
const images = ["elasticsearch:7.17.28", "elasticsearch:8.18.1", IMAGE];

describe("ElasticsearchContainer", { timeout: 180_000 }, () => {
  // createIndex {
  it.each(images)("should create an index with %s", async (image) => {
    const container = await new ElasticsearchContainer(image).start();
    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });
  // }

  // indexDocument {
  it("should index a document", async () => {
    const container = await new ElasticsearchContainer(IMAGE).start();
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
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new ElasticsearchContainer(IMAGE).start();
    await container.restart();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  }); // }

  it("should set custom password", async () => {
    const container = await new ElasticsearchContainer(IMAGE).withPassword("testPassword").start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });
});
