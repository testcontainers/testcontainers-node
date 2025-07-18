import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";
import path from "path";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { QdrantContainer } from "./qdrant-container";

const IMAGE = getImage(__dirname);

describe("QdrantContainer", { timeout: 100_000 }, () => {
  // connectQdrantSimple {
  it("should connect to the client", async () => {
    await using container = await new QdrantContainer(IMAGE).start();

    const client = new QdrantClient({ url: `http://${container.getRestHostAddress()}` });

    expect((await client.getCollections()).collections.length).toBe(0);
  });
  // }

  // connectQdrantWithApiKey {
  it("should work with valid API keys", async () => {
    const apiKey = crypto.randomUUID();

    await using container = await new QdrantContainer(IMAGE).withApiKey(apiKey).start();

    const client = new QdrantClient({ url: `http://${container.getRestHostAddress()}`, apiKey });

    expect((await client.getCollections()).collections.length).toBe(0);
  });
  // }

  it("should fail for invalid API keys", async () => {
    const apiKey = crypto.randomUUID();

    await using container = await new QdrantContainer(IMAGE).withApiKey(apiKey).start();

    const client = new QdrantClient({
      url: `http://${container.getRestHostAddress()}`,
      apiKey: "INVALID_KEY_" + crypto.randomUUID(),
    });

    await expect(client.getCollections()).rejects.toThrow("Unauthorized");
  });

  // connectQdrantWithConfig {
  it("should work with config files - valid API key", async () => {
    await using container = await new QdrantContainer(IMAGE)
      .withConfigFile(path.resolve(__dirname, "test_config.yaml"))
      .start();

    const client = new QdrantClient({ url: `http://${container.getRestHostAddress()}`, apiKey: "SOME_TEST_KEY" });

    expect((await client.getCollections()).collections.length).toBe(0);
  });
  // }

  it("should work with config files - invalid API key", async () => {
    await using container = await new QdrantContainer(IMAGE)
      .withConfigFile(path.resolve(__dirname, "test_config.yaml"))
      .start();

    const client = new QdrantClient({
      url: `http://${container.getRestHostAddress()}`,
      apiKey: "INVALID_KEY_" + crypto.randomUUID(),
    });

    await expect(client.getCollections()).rejects.toThrow("Unauthorized");
  });
});
