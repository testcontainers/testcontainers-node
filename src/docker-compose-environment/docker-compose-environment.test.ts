import fetch from "node-fetch";
import path from "path";
import { DockerComposeEnvironment } from "./docker-compose-environment";
import { Wait } from "../wait";
import { getRunningContainerNames, getVolumeNames } from "../test-helper";

describe("DockerComposeEnvironment", () => {
  jest.setTimeout(180_000);

  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker-compose");

  it("should throw error when compose file is malformed", async () => {
    await expect(new DockerComposeEnvironment(fixtures, "docker-compose-malformed.yml").up()).rejects.toThrowError();
  });

  it("should start all containers in the compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    await Promise.all(
      ["container_1", "another_container_1"].map(async (containerName) => {
        const container = startedEnvironment.getContainer(containerName);
        const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
    await startedEnvironment.down();
  });

  it("should start container with a given name", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml").up();
    const container = startedEnvironment.getContainer("custom_container_name");

    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);
    await startedEnvironment.down();
  });

  it("should start environment with multiple compose files", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-override");

    const startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, [
      "docker-compose.yml",
      "docker-compose-update.yml",
    ]).up();
    const container = startedEnvironment.getContainer("container_1");

    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();

    expect(responseBody["IS_OVERRIDDEN"]).toBe("true");
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
        const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
    await startedEnvironment.down();
  });

  it("should stop the container when the log message wait strategy times out", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
        .withWaitStrategy("custom_container_name", Wait.forLogMessage("unexpected"))
        .withStartupTimeout(0)
        .up()
    ).rejects.toThrowError(`Log message "unexpected" not received after 0ms`);

    expect(await getRunningContainerNames()).not.toContain("custom_container_name");
  });

  it("should stop the container when the health check wait strategy times out", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck.yml")
        .withWaitStrategy("container_1", Wait.forHealthCheck())
        .withStartupTimeout(0)
        .up()
    ).rejects.toThrowError(`Health check not healthy after 0ms`);

    expect(await getRunningContainerNames()).not.toContain("container_1");
  });

  it("should support health check wait strategy", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck.yml")
      .withWaitStrategy("container_1", Wait.forHealthCheck())
      .up();

    const container = startedEnvironment.getContainer("container_1");
    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
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

    const testVolumes = (await getVolumeNames()).filter((volumeName) => volumeName.includes("test-volume"));
    expect(testVolumes).toHaveLength(0);
  });

  it("should not wait for non-public ports", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(
      fixtures,
      "docker-compose-with-private-port.yml"
    ).up();

    await startedEnvironment.down();
  });

  it("should re-build the Dockerfiles", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").withBuild().up();

    await Promise.all(
      ["container_1", "another_container_1"].map(async (containerName) => {
        const container = startedEnvironment.getContainer(containerName);
        const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
    await startedEnvironment.down();
  });

  it("should bind environment variables to the docker compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-env.yml")
      .withEnv("ENV_VAR", "ENV_VAR_VALUE")
      .up();

    const container = startedEnvironment.getContainer("container_1");
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = await response.json();
    expect(responseBody["ENV_VAR"]).toBe("ENV_VAR_VALUE");
    await startedEnvironment.down();
  });

  it("should throw error when you get container that does not exist", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    expect(() => startedEnvironment.getContainer("non_existent_container")).toThrowError(
      `Cannot get container "non_existent_container" as it is not running`
    );
    await startedEnvironment.down();
  });

  it("should support starting a subset of services defined in the docker-compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-many-services.yml").up(
      ["service_2"]
    );

    const container = startedEnvironment.getContainer(`service_2_1`);
    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);
    expect(() => startedEnvironment.getContainer("service_1")).toThrowError(
      `Cannot get container "service_1" as it is not running`
    );
    await startedEnvironment.down();
  });
});
