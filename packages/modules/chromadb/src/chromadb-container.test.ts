import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import { AdminClient, ChromaClient } from "chromadb";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GenericContainer } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ChromaDBContainer } from "./chromadb-container";

const IMAGE = getImage(__dirname);
const OLLAMA_IMAGE = getImage(__dirname, 1);

describe("ChromaDBContainer", { timeout: 360_000 }, () => {
  it("should connect", async () => {
    await using container = await new ChromaDBContainer(IMAGE).start();
    const client = new ChromaClient({ ssl: false, host: container.getHost(), port: container.getMappedPort(8000) });
    expect(await client.heartbeat()).toBeDefined();
  });

  it("should create collection and get data", async () => {
    // chromaCreateCollection {
    await using container = await new ChromaDBContainer(IMAGE).start();

    const client = new ChromaClient({ ssl: false, host: container.getHost(), port: container.getMappedPort(8000) });
    const collection = await client.createCollection({ name: "test", metadata: { "hnsw:space": "cosine" } });
    expect(collection.name).toBe("test");

    await collection.add({ ids: ["1"], embeddings: [[1, 2, 3]], documents: ["my doc"], metadatas: [{ key: "value" }] });
    const getResults = await collection.get({ ids: ["1"] });
    expect(getResults.ids[0]).toBe("1");
    expect(getResults.documents[0]).toStrictEqual("my doc");
    expect(getResults.metadatas).toBeDefined();
    expect(getResults.metadatas?.[0]?.key).toStrictEqual("value");
    // }
  });

  it("should create collection and query", async () => {
    // queryCollectionWithEmbeddingFunction {
    await using container = await new ChromaDBContainer(IMAGE).start();

    await using ollama = await new GenericContainer(OLLAMA_IMAGE).withExposedPorts(11434).start();
    await ollama.exec(["ollama", "pull", "nomic-embed-text"]);
    const client = new ChromaClient({ ssl: false, host: container.getHost(), port: container.getMappedPort(8000) });
    const embedder = new OllamaEmbeddingFunction({
      url: `http://${ollama.getHost()}:${ollama.getMappedPort(11434)}`,
      model: "nomic-embed-text",
    });

    const collection = await client.createCollection({
      name: "test",
      metadata: { "hnsw:space": "cosine" },
      embeddingFunction: embedder,
    });
    expect(collection.name).toBe("test");

    await collection.add({
      ids: ["1", "2"],
      documents: [
        "This is a document about dogs. Dogs are awesome.",
        "This is a document about cats. Cats are awesome.",
      ],
    });
    const results = await collection.query({ queryTexts: ["Tell me about dogs"], nResults: 1 });
    expect(results).toBeDefined();
    expect(results.ids[0]).toEqual(["1"]);
    expect(results.ids[0][0]).toBe("1");
    // }
  });

  it("should reconnect with volume and persistence data", async () => {
    try {
      // persistentData {
      const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), "chroma-temp"));
      await using container = await new ChromaDBContainer(IMAGE)
        .withBindMounts([{ source: sourcePath, target: "/data" }])
        .start();

      const client = new ChromaClient({ ssl: false, host: container.getHost(), port: container.getMappedPort(8000) });
      const collection = await client.createCollection({ name: "test", metadata: { "hnsw:space": "cosine" } });
      expect(collection.name).toBe("test");

      await collection.add({ ids: ["1"], embeddings: [[1, 2, 3]], documents: ["my doc"] });
      const getResults = await collection.get({ ids: ["1"] });
      expect(getResults.ids[0]).toBe("1");
      expect(getResults.documents[0]).toStrictEqual("my doc");
      expect(fs.existsSync(`${sourcePath}/chroma.sqlite3`)).toBe(true);
      // }
    } finally {
      fs.rmSync(path.join(os.tmpdir(), "chroma-temp"), { force: true, recursive: true });
    }
  });

  it("should use auth", async () => {
    // chromaAuth {
    const tenant = "test-tenant";
    const key = "test-key";
    const database = "test-db";

    await using container = await new ChromaDBContainer(IMAGE)
      .withEnvironment({
        CHROMA_SERVER_AUTHN_CREDENTIALS: key,
        CHROMA_SERVER_AUTHN_PROVIDER: "chromadb.auth.token_authn.TokenAuthenticationServerProvider",
        CHROMA_AUTH_TOKEN_TRANSPORT_HEADER: "X-Chroma-Token",
      })
      .start();

    const adminClient = new AdminClient({
      ssl: false,
      host: container.getHost(),
      port: container.getMappedPort(8000),
      headers: {
        "X-Chroma-Token": key,
      },
    });

    await adminClient.createTenant({ name: tenant });
    await adminClient.createDatabase({ name: database, tenant: tenant });

    const dbClient = new ChromaClient({
      tenant,
      ssl: false,
      host: container.getHost(),
      port: container.getMappedPort(8000),
      headers: {
        "X-Chroma-Token": key,
      },
      database,
    });

    const collection = await dbClient.createCollection({ name: "test-collection" });
    expect(collection.name).toBe("test-collection");
    // }
  });
});
