import { QdrantContainer } from "./qdrant-container";
import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";
import path from "path";

describe("QdrantContainer", () => {
  jest.setTimeout(100_000);

  // connectQdrantSimple {
  it("should connect to the client", async () => {
    const container = await new QdrantContainer().start();

    const client = new QdrantClient({ url: `http://${container.getRestHostAddress()}` });

    expect((await client.getCollections()).collections.length).toBe(0);

    await container.stop();
  });
  // }

  // connectQdrantWithApiKey {
  it("should work with valid API keys", async () => {
    const apiKey = crypto.randomUUID();

    const container = await new QdrantContainer().withApiKey(apiKey).start();

    const client = new QdrantClient({ url: `http://${container.getRestHostAddress()}`, apiKey });

    expect((await client.getCollections()).collections.length).toBe(0);

    await container.stop();
  });
  // }

  it("should fail for invalid API keys", async () => {
    const apiKey = crypto.randomUUID();

    const container = await new QdrantContainer().withApiKey(apiKey).start();

    const client = new QdrantClient({
      url: `http://${container.getRestHostAddress()}`,
      apiKey: "INVALID_KEY_" + crypto.randomUUID(),
    });

    expect(client.getCollections()).rejects.toThrow("Forbidden");

    await container.stop();
  });

  // connectQdrantWithConfig {
  it("should work with config files - valid API key", async () => {
    const container = await new QdrantContainer().withConfigFile(path.resolve(__dirname, "test_config.yaml")).start();

    const client = new QdrantClient({ url: `http://${container.getRestHostAddress()}`, apiKey: "SOME_TEST_KEY" });

    expect((await client.getCollections()).collections.length).toBe(0);

    await container.stop();
  });
  // }

  it("should work with config files - invalid API key", async () => {
    const container = await new QdrantContainer().withConfigFile(path.resolve(__dirname, "test_config.yaml")).start();

    const client = new QdrantClient({
      url: `http://${container.getRestHostAddress()}`,
      apiKey: "INVALID_KEY_" + crypto.randomUUID(),
    });

    expect(client.getCollections()).rejects.toThrow("Forbidden");

    await container.stop();
  });
});
