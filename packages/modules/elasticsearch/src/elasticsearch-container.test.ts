import { Client } from "@elastic/elasticsearch";
import { ElasticsearchContainer } from "./elasticsearch-container";

const IMAGE = "elasticsearch:7.17.7";

describe("ElasticsearchContainer", { timeout: 180_000 }, () => {
  // createIndex {
  it("should create an index", async () => {
    const container = await new ElasticsearchContainer(IMAGE).start();
    const client = new Client({ node: container.getHttpUrl() });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });
  // }

  // indexDocument {
  it("should index a document", async () => {
    const container = await new ElasticsearchContainer(IMAGE).start();
    const client = new Client({ node: container.getHttpUrl() });

    const document = {
      id: "1",
      name: "John Doe",
    };
    await client.index({
      index: "people",
      id: document.id,
      document,
    });

    /*
    body?: string | ({
        [key: string]: any;
    } & {
        id?: never;
        index?: never;
        if_primary_term?: never;
        if_seq_no?: never;
        include_source_on_error?: never;
        op_type?: never;
        pipeline?: never;
        refresh?: never;
        routing?: never;
        timeout?: never;
        version?: never;
        version_type?: never;
        wait_for_active_shards?: never;
        require_alias?: never;
        document?: never;
    })
     */

    expect((await client.get({ index: "people", id: document.id }))._source).toStrictEqual(document);
    await container.stop();
  });
  // }

  it("should work with restarted container", async () => {
    const container = await new ElasticsearchContainer(IMAGE).start();
    await container.restart();

    const client = new Client({ node: container.getHttpUrl() });

    await client.indices.create({ index: "people" });

    expect(await client.indices.exists({ index: "people" })).toBe(true);
    await container.stop();
  });
});
