import path from "path";
import { RandomUuid } from "../common";
import { randomUuid } from "../common/uuid";
import { PullPolicy } from "../utils/pull-policy";
import {
  checkEnvironmentContainerIsHealthy,
  composeContainerName,
  getDockerEventStream,
  getRunningContainerNames,
  getVolumeNames,
  waitForDockerEvent,
} from "../utils/test-helper";
import { Wait } from "../wait-strategies/wait";
import { DockerComposeEnvironment } from "./docker-compose-environment";

describe("DockerComposeEnvironment", { timeout: 180_000 }, () => {
  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker-compose");

  it("should throw error when compose file is malformed", async () => {
    await expect(new DockerComposeEnvironment(fixtures, "docker-compose-malformed.yml").up()).rejects.toThrow();
  });

  it("should start all containers in the compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    await Promise.all(
      [await composeContainerName("container"), await composeContainerName("another_container")].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );

    await startedEnvironment.down();
  });

  it("should start container with a given name", async () => {
    const name = `custom_container_name_${randomUuid()}`;
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
      .withEnvironment({ CONTAINER_NAME: name })
      .up();

    await checkEnvironmentContainerIsHealthy(startedEnvironment, name);

    await startedEnvironment.down();
  });

  it("should use pull policy", async () => {
    const env = new DockerComposeEnvironment(fixtures, "docker-compose-with-many-services.yml");

    const startedEnv1 = await env.up();
    const dockerEventStream = await getDockerEventStream();
    const dockerPullEventPromise = waitForDockerEvent(dockerEventStream, "pull");
    const startedEnv2 = await env.withPullPolicy(PullPolicy.alwaysPull()).up();
    await dockerPullEventPromise;

    dockerEventStream.destroy();
    await startedEnv1.stop();
    await startedEnv2.stop();
  });

  it("should use pull policy for specific service", async () => {
    const env = new DockerComposeEnvironment(fixtures, "docker-compose-with-many-services.yml");

    const startedEnv1 = await env.up(["service_2"]);
    const dockerEventStream = await getDockerEventStream();
    const dockerPullEventPromise = waitForDockerEvent(dockerEventStream, "pull");
    const startedEnv2 = await env.withPullPolicy(PullPolicy.alwaysPull()).up(["service_2"]);
    await dockerPullEventPromise;

    dockerEventStream.destroy();
    await startedEnv1.stop();
    await startedEnv2.stop();
  });

  it("should start environment with multiple compose files", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-override");

    const startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, [
      "docker-compose.yml",
      "docker-compose-update.yml",
    ]).up();
    const container = startedEnvironment.getContainer(await composeContainerName("container"));

    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };

    expect(responseBody["IS_OVERRIDDEN"]).toBe("true");

    await startedEnvironment.down();
  });

  it("should support log message wait strategy", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withWaitStrategy(await composeContainerName("container"), Wait.forLogMessage("Listening on port 8080"))
      .withWaitStrategy(await composeContainerName("another_container"), Wait.forLogMessage("Listening on port 8080"))
      .up();

    await Promise.all(
      [await composeContainerName("container"), await composeContainerName("another_container")].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );

    await startedEnvironment.down();
  });

  it("should stop the container when the log message wait strategy times out", async () => {
    const name = `custom_container_name_${randomUuid()}`;
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
        .withEnvironment({ CONTAINER_NAME: name })
        .withWaitStrategy(name, Wait.forLogMessage("unexpected"))
        .withStartupTimeout(0)
        .up()
    ).rejects.toThrow(`Log message "unexpected" not received after 0ms`);

    expect(await getRunningContainerNames()).not.toContain(name);
  });

  it("should support health check wait strategy", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck.yml")
      .withWaitStrategy(await composeContainerName("container"), Wait.forHealthCheck())
      .up();

    await checkEnvironmentContainerIsHealthy(startedEnvironment, await composeContainerName("container"));

    await startedEnvironment.down();
  });

  it("should support failing health check wait strategy", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck-unhealthy.yml")
        .withWaitStrategy(await composeContainerName("container"), Wait.forHealthCheck())
        .up()
    ).rejects.toThrow(`Health check failed: unhealthy`);
  });

  it("should stop the container when the health check wait strategy times out", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck-with-start-period.yml")
        .withWaitStrategy(await composeContainerName("container"), Wait.forHealthCheck())
        .withStartupTimeout(0)
        .up()
    ).rejects.toThrow(`Health check not healthy after 0ms`);

    expect(await getRunningContainerNames()).not.toContain("container_1");
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
      [await composeContainerName("container"), await composeContainerName("another_container")].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );

    await startedEnvironment.down();
  });

  it("should bind environment variables to the docker compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-env.yml")
      .withEnvironment({ ENV_VAR: "ENV_VAR_VALUE" })
      .up();

    const container = startedEnvironment.getContainer(await composeContainerName("container"));
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };
    expect(responseBody["ENV_VAR"]).toBe("ENV_VAR_VALUE");

    await startedEnvironment.down();
  });

  it("should throw error when you get container that does not exist", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    expect(() => startedEnvironment.getContainer("non_existent_container")).toThrow(
      `Cannot get container "non_existent_container" as it is not running`
    );

    await startedEnvironment.down();
  });

  it("should support starting a subset of services defined in the docker-compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-many-services.yml").up(
      ["service_2"]
    );

    await checkEnvironmentContainerIsHealthy(startedEnvironment, await composeContainerName("service_2"));
    expect(() => startedEnvironment.getContainer("service_1")).toThrow(
      `Cannot get container "service_1" as it is not running`
    );

    await startedEnvironment.down();
  });

  it("should not recreate the containers when no recreate option is set", async () => {
    const startedEnvironment1 = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
      .withEnvironment({ CONTAINER_NAME: `custom_container_name_${randomUuid()}` })
      .withNoRecreate()
      .up();
    const startedEnvironment2 = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
      .withEnvironment({ CONTAINER_NAME: `custom_container_name_${randomUuid()}` })
      .withNoRecreate()
      .up();

    await startedEnvironment1.down();
    await startedEnvironment2.down();
  });

  it("should load .env if no environment file option given", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-env-file");

    const startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, "docker-compose.yml").up();

    const container = startedEnvironment.getContainer(await composeContainerName("container"));
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };
    expect(responseBody["ENV_VAR"]).toBe("default");

    await startedEnvironment.down();
  });

  it("should load the values in the environment file if the environment file option is set", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-env-file");

    const startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, "docker-compose.yml")
      .withEnvironmentFile(".env.override")
      .up();

    const container = startedEnvironment.getContainer(await composeContainerName("container"));
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };
    expect(responseBody["ENV_VAR"]).toBe("override");

    await startedEnvironment.down();
  });

  it("should start containers with a profile if profile option is set", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-profile.yml")
      .withProfiles("debug")
      .up();

    await Promise.all(
      [await composeContainerName("container"), await composeContainerName("another_container")].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );

    await startedEnvironment.down();
  });

  it("should use a custom project name if set", async () => {
    const customProjectName = `custom-${new RandomUuid().nextUuid()}`;
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withProjectName(customProjectName)
      .up();

    expect(await getRunningContainerNames()).toContain(`${customProjectName}-container-1`);

    await startedEnvironment.down();
  });
});
