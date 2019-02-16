import fetch from "node-fetch";
import { GenericContainer } from "./generic-container";
import { StartedTestContainer } from "./test-container";

describe("GenericContainer", () => {
  let container: StartedTestContainer;
  let url: string;

  beforeAll(async () => {
    container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.7")
      .withEnv("customKey", "customValue")
      .withExposedPorts(8080)
      .start();
    url = `http://localhost:${container.getMappedPort(8080)}`;
  }, 10000);

  afterAll(async () => {
    await container.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should expose ports", async () => {
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);
  });

  it("should set environment variables", async () => {
    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();
    expect(responseBody.customKey).toBe("customValue");
  });
});
