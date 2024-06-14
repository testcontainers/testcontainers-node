import { OllamaContainer } from "./ollama-container";

describe("OllamaContainer", () => {
  jest.setTimeout(180_000);

  it("should run ollama with default config", async () => {
    const container = await new OllamaContainer("ollama/ollama:0.1.44").start();
    const response = await fetch(`${container.getEndpoint()}/api/version`);
    expect(response.status).toEqual(200);
    const body = await response.json();
    expect(body.version).toEqual("0.1.44");
    await container.stop();
  });
});
