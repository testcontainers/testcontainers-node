import { AdminClient, ChromaClient, OllamaEmbeddingFunction } from "chromadb";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GenericContainer } from "testcontainers";
import { ChromaDBContainer, StartedChromaDBContainer } from "./chromadb-container";

const IMAGE = "chromadb/chroma:0.6.3";

describe("ChromaDB", { timeout: 360_000 }, () => {
  // startContainer {
  it("should connect", async () => {
    const container = await new ChromaDBContainer(IMAGE).start();
    const client = await connectTo(container);
    expect(await client.heartbeat()).toBeDefined();
    // Do something with the client
    await container.stop();
  });
  // }

  // simpleConnect {
  async function connectTo(container: StartedChromaDBContainer) {
    const client = new ChromaClient({
      path: container.getHttpUrl(),
    });
    const hb = await client.heartbeat();
    expect(hb).toBeDefined();
    return client;
  }
  // }

  // createCollection {
  it("should create collection and get data", async () => {
    const container = await new ChromaDBContainer(IMAGE).start();
    const client = await connectTo(container);
    const collection = await client.createCollection({ name: "test", metadata: { "hnsw:space": "cosine" } });
    expect(collection.name).toBe("test");
    expect(collection.metadata).toBeDefined();
    expect(collection.metadata?.["hnsw:space"]).toBe("cosine");
    await collection.add({ ids: ["1"], embeddings: [[1, 2, 3]], documents: ["my doc"], metadatas: [{ key: "value" }] });
    const getResults = await collection.get({ ids: ["1"] });
    expect(getResults.ids[0]).toBe("1");
    expect(getResults.documents[0]).toStrictEqual("my doc");
    expect(getResults.metadatas).toBeDefined();
    expect(getResults.metadatas?.[0]?.key).toStrictEqual("value");
    await container.stop();
  });
  // }

  // queryCollectionWithEmbeddingFunction {
  it("should create collection and query", async () => {
    const container = await new ChromaDBContainer(IMAGE).start();
    const ollama = await new GenericContainer("ollama/ollama").withExposedPorts(11434).start();
    await ollama.exec(["ollama", "pull", "nomic-embed-text"]);
    const client = await connectTo(container);
    const embedder = new OllamaEmbeddingFunction({
      url: `http://${ollama.getHost()}:${ollama.getMappedPort(11434)}/api/embeddings`,
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
    await container.stop();
  });

  // persistentData {
  it("should reconnect with volume and persistence data", async () => {
    const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), "chroma-temp"));
    const container = await new ChromaDBContainer(IMAGE)
      .withBindMounts([{ source: sourcePath, target: "/chroma/chroma" }])
      .start();
    const client = await connectTo(container);
    const collection = await client.createCollection({ name: "test", metadata: { "hnsw:space": "cosine" } });
    expect(collection.name).toBe("test");
    expect(collection.metadata).toBeDefined();
    expect(collection.metadata?.["hnsw:space"]).toBe("cosine");
    await collection.add({ ids: ["1"], embeddings: [[1, 2, 3]], documents: ["my doc"] });
    const getResults = await collection.get({ ids: ["1"] });
    expect(getResults.ids[0]).toBe("1");
    expect(getResults.documents[0]).toStrictEqual("my doc");
    await container.stop();
    expect(fs.existsSync(`${sourcePath}/chroma.sqlite3`)).toBe(true);
    try {
      fs.rmSync(sourcePath, { force: true, recursive: true });
    } catch (e) {
      // Ignore clean up, when have no access on fs.
      console.log(e);
    }
  });
  // }

  // auth {
  it("should use auth", async () => {
    const tenant = "test-tenant";
    const key = "test-key";
    const database = "test-db";
    const container = await new ChromaDBContainer(IMAGE)
      .withEnvironment({
        CHROMA_SERVER_AUTHN_CREDENTIALS: key,
        CHROMA_SERVER_AUTHN_PROVIDER: "chromadb.auth.token_authn.TokenAuthenticationServerProvider",
        CHROMA_AUTH_TOKEN_TRANSPORT_HEADER: "X-Chroma-Token",
      })
      .start();

    const adminClient = new AdminClient({
      tenant: tenant,
      auth: {
        provider: "token",
        credentials: key,
        tokenHeaderType: "X_CHROMA_TOKEN",
      },
      path: container.getHttpUrl(),
    });

    await adminClient.createTenant({ name: tenant });
    await adminClient.createDatabase({ name: database, tenantName: tenant });

    const dbClient = new ChromaClient({
      tenant,
      auth: {
        provider: "token",
        credentials: key,
        tokenHeaderType: "X_CHROMA_TOKEN",
      },
      path: container.getHttpUrl(),
      database,
    });

    const collection = await dbClient.createCollection({ name: "test-collection" });
    expect(collection.name).toBe("test-collection");
  });
  // }
});
