import { ImageName, randomUuid } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { OllamaContainer } from "./ollama-container";

const IMAGE = getImage(__dirname);

describe("OllamaContainer", { timeout: 180_000 }, () => {
  it("should run ollama with default config", async () => {
    // container {
    await using container = await new OllamaContainer(IMAGE).start();
    // }
    const response = await fetch(`${container.getEndpoint()}/api/version`);
    expect(response.status).toEqual(200);
    const body = (await response.json()) as { version: string };
    expect(body.version).toEqual(ImageName.fromString(IMAGE).tag);
  });

  it.skip("download model and commit to image", async () => {
    // ollamaPullModel {
    await using container = await new OllamaContainer(IMAGE).start();
    await container.exec(["ollama", "pull", "all-minilm"]);

    const response = await fetch(`${container.getEndpoint()}/api/tags`);
    expect(response.status).toEqual(200);
    const body = (await response.json()) as { models: { name: string }[] };
    expect(body.models[0].name).toContain("all-minilm");

    const newImageName = "tc-ollama-allminilm-" + randomUuid().substring(4);
    await container.commitToImage(newImageName);

    await using newContainer = await new OllamaContainer(newImageName).start();
    const newResponse = await fetch(`${newContainer.getEndpoint()}/api/tags`);
    expect(newResponse.status).toEqual(200);
    const newBody = (await newResponse.json()) as { models: { name: string }[] };
    expect(newBody.models[0].name).toContain("all-minilm");
    // }
  });
});
