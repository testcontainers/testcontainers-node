import { Client } from "@opensearch-project/opensearch";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { OpenSearchContainer } from "./opensearch-container";

const IMAGE = getImage(__dirname);
const images = ["opensearchproject/opensearch:2.19.2", IMAGE];

describe("OpenSearchContainer", { timeout: 180_000 }, () => {
  it.each(images)("should create an index with %s", async (image) => {
    // opensearchCreateIndex {
    await using container = await new OpenSearchContainer(image).start();

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

    const { body } = await client.indices.exists({ index: "people" });
    expect(body).toBe(true);
    // }
  });

  it("should index a document", async () => {
    // opensearchIndexDocument {
    await using container = await new OpenSearchContainer(IMAGE).start();

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

    const { body } = await client.get({ index: "people", id: document.id });
    expect(body._source).toEqual(document);
    // }
  });

  it("should work with restarted container", async () => {
    await using container = await new OpenSearchContainer(IMAGE).start();
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

    const existsResponse = await client.indices.exists({ index: "people" });
    expect(existsResponse.body).toBe(true);
  });

  it("should throw when given an invalid password", () => {
    expect(() => new OpenSearchContainer(IMAGE).withPassword("weakpwd")).toThrowError(/Password "weakpwd" is too weak/);
  });

  it("should set custom password", async () => {
    // opensearchCustomPassword {
    await using container = await new OpenSearchContainer(IMAGE).withPassword("Str0ng!Passw0rd2025").start();
    // }

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

    const { body } = await client.indices.exists({ index: "people" });
    expect(body).toBe(true);
  });

  it("should be reachable with security disabled", async () => {
    // opensearchDisableSecurity {
    await using container = await new OpenSearchContainer(IMAGE).withSecurityEnabled(false).start();

    const client = new Client({
      node: container.getHttpUrl(),
      // no auth, or ssl required
    });
    // }

    // Url should start with http not https.
    expect(container.getHttpUrl()).toMatch(/^http:\/\/.*/);

    await client.indices.create({ index: "people" });

    const { body } = await client.indices.exists({ index: "people" });
    expect(body).toBe(true);
  });
});
