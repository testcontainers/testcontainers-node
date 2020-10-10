import fetch from "node-fetch";
import path from "path";
import { DockerComposeEnvironment } from "./docker-compose-environment";
import { Wait } from "./wait";
import Dockerode from "dockerode";

describe("DockerComposeEnvironment", () => {
  jest.setTimeout(60000);

  const fixtures = path.resolve(__dirname, "..", "fixtures", "docker-compose");
  const dockerodeClient = new Dockerode();

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

  it("should support log message wait strategy", async () => {
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

  it("should support health check wait strategy", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck.yml")
      .withWaitStrategy("container_1", Wait.forHealthCheck())
      .up();

    const container = startedEnvironment.getContainer("container_1");
    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await startedEnvironment.down();
  });

  it("should stop a docker-compose environment", async () => {
    const environment1 = await new DockerComposeEnvironment(fixtures, "docker-compose-with-network.yml").up();
    const environment2 = await new DockerComposeEnvironment(fixtures, "docker-compose-with-network.yml").up();

    const stoppedEnvironment = await environment2.stop();
    await environment1.down();

    await stoppedEnvironment.down();
  });

  it("should remove volumes when downing an environment", async () => {
    const environment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-volume.yml").up();

    await environment.down();

    const testVolumes = (await dockerodeClient.listVolumes()).Volumes.map(
      (volume) => volume.Name
    ).filter((volumeName) => volumeName.includes("test-volume"));

    expect(testVolumes).toHaveLength(0);
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
