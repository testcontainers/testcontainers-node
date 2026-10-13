import weaviate from "weaviate-ts-client";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { WeaviateContainer } from "./weaviate-container";

const IMAGES = ["semitechnologies/weaviate:1.38.21", getImage(__dirname)];

describe.each(IMAGES)("WeaviateContainer (%s)", { timeout: 100_000 }, (image) => {
  it("should expose ports", async () => {
    // connectWeaviate {
    await using container = await new WeaviateContainer(image).start();

    expect(container.getHttpHostAddress()).toBeDefined();
    expect(container.getGrpcHostAddress()).toBeDefined();
    // }
  });

  it("should connect to Weaviate", async () => {
    // connectWeaviateWithClient {
    await using container = await new WeaviateContainer(image).start();

    const client = weaviate.client({
      scheme: "http",
      host: container.getHttpHostAddress(),
    });

    const res = await client.misc.metaGetter().do();
    expect(res.version).toBeDefined();
    // }
  });

  it("should connect to Weaviate with modules", async () => {
    // connectWeaviateWithModules {
    const enableModules = [
      "backup-filesystem",
      "text2vec-openai",
      "text2vec-cohere",
      "text2vec-huggingface",
      "generative-openai",
    ];
    const environment = {
      ENABLE_MODULES: enableModules.join(","),
      BACKUP_FILESYSTEM_PATH: "/tmp/backups",
    };

    await using container = await new WeaviateContainer(image).withEnvironment(environment).start();

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
    // }
  });
});
