import { Client } from "@opensearch-project/opensearch";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { OpenSearchContainer } from "./opensearch-container";

const IMAGE = getImage(__dirname);
const images = [
  "opensearchproject/opensearch:2.12.0",
  "opensearchproject/opensearch:2.19.2",
  IMAGE,
];

describe("OpenSearchContainer", { timeout: 180_000 }, () => {
  // createIndex
  it.each(images)("should create an index with %s", async (image) => {
    const container = await new OpenSearchContainer(image).start();
    const client = new Client({
      node: container.getHttpUrl(),
      auth: {
        username: container.getUsername(),
        password: container.getPassword(),
      },
      ssl: {
        // trust the self-signed cert
        rejectUnauthorized: false,
      },
    });

    await client.indices.create({ index: "people" });
    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });

  // indexDocument
  it("should index a document", async () => {
    const container = await new OpenSearchContainer(IMAGE).start();
    const client = new Client({
      node: container.getHttpUrl(),
      auth: {
        username: container.getUsername(),
        password: container.getPassword(),
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const document = { id: "1", name: "John Doe" };

    await client.index({
      index: "people",
      id: document.id,
      body: document,
    });

    const getResponse = await client.get({ index: "people", id: document.id });
    expect(getResponse.body._source).toStrictEqual(document);
    await container.stop();
  });

  it("should work with restarted container", async () => {
    const container = await new OpenSearchContainer(IMAGE).start();
    await container.restart();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: {
        username: container.getUsername(),
        password: container.getPassword(),
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.indices.create({ index: "people" });
    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });

  it("should set custom password", async () => {
    const container = await new OpenSearchContainer(IMAGE)
      .withPassword("testPassword")
      .start();

    const client = new Client({
      node: container.getHttpUrl(),
      auth: {
        username: container.getUsername(),
        password: container.getPassword(),
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.indices.create({ index: "people" });
    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });
});
