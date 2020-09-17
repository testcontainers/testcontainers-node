import fetch from "node-fetch";
import path from "path";
import { DockerComposeEnvironment } from "./docker-compose-environment";
import { Wait } from "./wait";

describe("DockerComposeEnvironment", () => {
  jest.setTimeout(60000);

  const fixtures = path.resolve(__dirname, "..", "fixtures", "docker-compose");

  it("should throw error when compose file is malformed", async () => {
    await expect(new DockerComposeEnvironment(fixtures, "docker-compose-malformed.yml").up()).rejects.toThrowError(
      `Version in "./docker-compose-malformed.yml" is invalid - it should be a string.`
    );
  });

  it("should start all containers in the compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    await Promise.all(
      ["container_1", "another_container_1"].map(async (containerName) => {
        const container = startedEnvironment.getContainer(containerName);
        const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
    await startedEnvironment.down();
  });

  it("should start container with a given name", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml").up();
    const container = startedEnvironment.getContainer("custom_container_name");

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);
    await startedEnvironment.down();
  });

  it("should support non-default wait strategies", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withWaitStrategy("container_1", Wait.forLogMessage("Listening on port 8080"))
      .withWaitStrategy("another_container_1", Wait.forLogMessage("Listening on port 8080"))
      .up();

    await Promise.all(
      ["container_1", "another_container_1"].map(async (containerName) => {
        const container = startedEnvironment.getContainer(containerName);
        const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
    await startedEnvironment.down();
  });

  it("should re-build the Dockerfiles", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").withBuild().up();

    await Promise.all(
      ["container_1", "another_container_1"].map(async (containerName) => {
        const container = startedEnvironment.getContainer(containerName);
        const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
    await startedEnvironment.down();
  });

  it("should throw error when you get container that does not exist", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    expect(() => startedEnvironment.getContainer("non_existent_container")).toThrowError(
      `Cannot get container "non_existent_container" as it is not running`
    );
    await startedEnvironment.down();
  });
});
