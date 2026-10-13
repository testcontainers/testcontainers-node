import { Client as Client9 } from "@elastic/elasticsearch";
import { Client as Client8 } from "@elastic/elasticsearch-8";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ElasticsearchContainer } from "./elasticsearch-container";

// A client can't talk to an older Elasticsearch major, so each image runs with the client of its own major.
const VERSIONS = [
  { image: "elasticsearch:8.19.23", Client: Client8 as unknown as typeof Client9 },
  { image: getImage(__dirname), Client: Client9 },
];

describe.each(VERSIONS)("ElasticsearchContainer ($image)", { concurrent: false, timeout: 180_000 }, (version) => {
  const { image, Client } = version;

  it.concurrent("should create an index", async () => {
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

  it.concurrent("should index a document", async () => {
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

  it.concurrent("should set custom password", async () => {
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

  it.concurrent("should work with restarted container", async () => {
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
