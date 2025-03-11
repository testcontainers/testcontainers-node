import { OllamaContainer } from "./ollama-container";

describe("OllamaContainer", { timeout: 180_000 }, () => {
  it("should run ollama with default config", async () => {
    // container {
    const container = await new OllamaContainer("ollama/ollama:0.1.44").start();
    // }
    const response = await fetch(`${container.getEndpoint()}/api/version`);
    expect(response.status).toEqual(200);
    const body = (await response.json()) as { version: string };
    expect(body.version).toEqual("0.1.44");
    await container.stop();
  });

  it.skip("download model and commit to image", async () => {
    const container = await new OllamaContainer("ollama/ollama:0.1.44").start();
    // pullModel {
    const execResult = await container.exec(["ollama", "pull", "all-minilm"]);
    // }
    console.log(execResult.output);
    const response = await fetch(`${container.getEndpoint()}/api/tags`);
    expect(response.status).toEqual(200);
    const body = (await response.json()) as { models: { name: string }[] };
    expect(body.models[0].name).toContain("all-minilm");

    const newImageName: string = "tc-ollama-allminilm-" + (Math.random() + 1).toString(36).substring(4).toLowerCase();
    // commitToImage {
    await container.commitToImage(newImageName);
    // }
    await container.stop();

    // substitute {
    const newContainer = await new OllamaContainer(newImageName).start();
    // }
    const response2 = await fetch(`${newContainer.getEndpoint()}/api/tags`);
    expect(response2.status).toEqual(200);
    const body2 = (await response2.json()) as { models: { name: string }[] };
    expect(body2.models[0].name).toContain("all-minilm");
    await newContainer.stop();
  });
});
