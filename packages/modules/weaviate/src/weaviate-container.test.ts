import { Environment } from "testcontainers/src/types";
import weaviate from "weaviate-ts-client";
import { WeaviateContainer } from "./weaviate-container";

describe("WeaviateContainer", { timeout: 100_000 }, () => {
  // connectWeaviate {
  it("should expose ports", async () => {
    const container = await new WeaviateContainer().start();

    expect(container.getHttpHostAddress()).toBeDefined();
    expect(container.getGrpcHostAddress()).toBeDefined();

    await container.stop();
  });
  // }

  // connectWeaviateWithClient {
  it("should connect to Weaviate", async () => {
    const container = await new WeaviateContainer().start();

    const client = weaviate.client({
      scheme: "http",
      host: container.getHttpHostAddress(),
    });

    const res = await client.misc.metaGetter().do();
    expect(res.version).toBeDefined();

    await container.stop();
  });
  // }

  // connectWeaviateWithModules {
  it("should connect to Weaviate with modules", async () => {
    const enableModules = [
      "backup-filesystem",
      "text2vec-openai",
      "text2vec-cohere",
      "text2vec-huggingface",
      "generative-openai",
    ];
    const environment: Environment = {
      ENABLE_MODULES: enableModules.join(","),
      BACKUP_FILESYSTEM_PATH: "/tmp/backups",
    };
    const container = await new WeaviateContainer().withEnvironment(environment).start();

    const client = weaviate.client({
      scheme: "http",
      host: container.getHttpHostAddress(),
    });

    const res = await client.misc.metaGetter().do();
    expect(res.version).toBeDefined();
    expect(res.modules).toBeDefined();
    enableModules.forEach((module) => {
      expect(res.modules[module]).toBeDefined();
    });

    await container.stop();
  });
  // }
});
