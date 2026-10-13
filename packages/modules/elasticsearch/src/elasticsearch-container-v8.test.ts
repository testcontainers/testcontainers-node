import { Client } from "@elastic/elasticsearch-8";
import { ElasticsearchContainer } from "./elasticsearch-container";

const IMAGE = "elasticsearch:8.19.23";

describe("ElasticsearchContainer 8", { concurrent: false, timeout: 180_000 }, () => {
  it("should create an index", async () => {
    await using container = await new ElasticsearchContainer(IMAGE).start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
  });

  it("should index a document", async () => {
    await using container = await new ElasticsearchContainer(IMAGE).start();

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
  });

  it("should set custom password", async () => {
    await using container = await new ElasticsearchContainer(IMAGE).withPassword("testPassword").start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
  });

  it("should work with restarted container", async () => {
    await using container = await new ElasticsearchContainer(IMAGE).start();
    await container.restart();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: { username: container.getUsername(), password: container.getPassword() },
    });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
  });
});
