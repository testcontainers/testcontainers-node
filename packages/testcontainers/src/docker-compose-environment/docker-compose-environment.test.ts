import path from "path";
import { log, RandomUuid } from "../common";
import { randomUuid } from "../common/uuid";
import { getContainerRuntimeClient, ImageName } from "../container-runtime";
import { PullPolicy } from "../utils/pull-policy";
import {
  checkEnvironmentContainerIsHealthy,
  createTempImageTag,
  getDockerEventStream,
  getHealthCheckStatus,
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
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    await Promise.all(
      ["container-1", "another_container-1"].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );
  });

  it("should start container with a given name", async () => {
    const name = `custom_container_name_${randomUuid()}`;
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
      .withEnvironment({ CONTAINER_NAME: name })
      .up();

    await checkEnvironmentContainerIsHealthy(startedEnvironment, name);
  });

  if (!process.env.CI_PODMAN) {
    it("should work with buildkit", async () => {
      const buildkitFixtures = path.resolve(fixtures, "docker-compose-with-buildkit");
      await using startedEnvironment = await new DockerComposeEnvironment(buildkitFixtures, "docker-compose.yml").up();
      await checkEnvironmentContainerIsHealthy(startedEnvironment, "container-1");
    });
  }

  it("should use pull policy", async () => {
    const env = new DockerComposeEnvironment(fixtures, "docker-compose-with-many-services.yml");

    await using _ = await env.up();

    {
      await using dockerEventStream = await getDockerEventStream();
      const dockerPullEventPromise = waitForDockerEvent(dockerEventStream.events, "pull");
      await using _ = await env.withPullPolicy(PullPolicy.alwaysPull()).up();
      await dockerPullEventPromise;
    }
  });

  it("should use pull policy for specific service", async () => {
    const env = new DockerComposeEnvironment(fixtures, "docker-compose-with-many-services.yml");

    await using _ = await env.up(["service-b"]);

    {
      await using dockerEventStream = await getDockerEventStream();
      const dockerPullEventPromise = waitForDockerEvent(dockerEventStream.events, "pull");
      await using _ = await env.withPullPolicy(PullPolicy.alwaysPull()).up(["service-b"]);
      await dockerPullEventPromise;
    }
  });

  it.each([
    { commandOptions: ["--no-color", "--pull=never", "--no-build=true"] },
    { commandOptions: ["--build=true", "--build=false", "--no-build=1"] },
    { commandOptions: ["--build=0", "--pull", "always", "--no-build=false"] },
    { commandOptions: ["--pull=missing"] },
  ])(
    "should start local service images with a never-pull policy and options $commandOptions",
    { concurrent: false },
    async ({ commandOptions }) => {
      const client = await getContainerRuntimeClient();
      await using image = await createTempImageTag("cristianrgreco/testcontainer:1.1.14");
      const upSpy = vi.spyOn(client.compose, "up");
      const originalCommandOptions = [...commandOptions];

      await using dockerEventStream = await getDockerEventStream();
      const dockerPullEventPromise = waitForDockerEvent(dockerEventStream.events, "pull", 1, image.name);
      const dockerStartEventPromise = waitForDockerEvent(dockerEventStream.events, "start", 2, image.name);
      let hasPulled = false;
      dockerPullEventPromise.then(() => (hasPulled = true));

      await using environment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-never-pull.yml")
        .withEnvironment({ TEST_IMAGE: image.name, OTHER_IMAGE: image.name })
        .withPullPolicy(PullPolicy.neverPull())
        .withClientOptions({ commandOptions })
        .up();

      await checkEnvironmentContainerIsHealthy(environment, "container-1");
      await checkEnvironmentContainerIsHealthy(environment, "other-1");
      await dockerStartEventPromise;
      expect(hasPulled).toBe(false);
      expect(upSpy).toHaveBeenCalledWith(
        expect.objectContaining({ commandOptions: [...originalCommandOptions, "--pull", "never", "--no-build"] }),
        undefined
      );
      expect(commandOptions).toEqual(originalCommandOptions);
    }
  );

  it("should apply a never-pull policy to selected services", async () => {
    const client = await getContainerRuntimeClient();
    const image = ImageName.fromString("cristianrgreco/testcontainer:1.1.14");
    await client.image.pull(image);

    await using environment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-never-pull.yml")
      .withEnvironment({
        TEST_IMAGE: image.string,
        OTHER_IMAGE: `localhost/testcontainers-missing-${randomUuid()}:latest`,
      })
      .withPullPolicy(PullPolicy.neverPull())
      .up(["container"]);

    await checkEnvironmentContainerIsHealthy(environment, "container-1");
    expect(() => environment.getContainer("other-1")).toThrow('Cannot get container "other-1" as it is not running');
  });

  it("should fail without pulling when a service image is missing", { concurrent: false }, async () => {
    const client = await getContainerRuntimeClient();
    const pullSpy = vi.spyOn(client.compose, "pull");
    const upSpy = vi.spyOn(client.compose, "up");
    const image = `localhost/testcontainers-missing-${randomUuid()}:latest`;

    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-never-pull.yml")
        .withEnvironment({ TEST_IMAGE: image, OTHER_IMAGE: image })
        .withPullPolicy(PullPolicy.neverPull())
        .up(["container"])
    ).rejects.toThrow(/No such image|image not known/i);
    expect(pullSpy).not.toHaveBeenCalled();
    expect(upSpy).toHaveBeenCalledWith(expect.objectContaining({ commandOptions: ["--pull", "never", "--no-build"] }), [
      "container",
    ]);
  });

  it("should not implicitly build a missing service image with a never-pull policy", async () => {
    const client = await getContainerRuntimeClient();
    const image = ImageName.fromString(`localhost/testcontainers-missing-${randomUuid()}:latest`);

    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-never-pull-build.yml")
        .withEnvironment({ TEST_IMAGE: image.string })
        .withPullPolicy(PullPolicy.neverPull())
        .up()
    ).rejects.toThrow(/No such image|image not known/i);
    await expect(client.image.inspect(image)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("should reject explicit builds with a never-pull policy", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose.yml")
        .withPullPolicy(PullPolicy.neverPull())
        .withBuild()
        .up()
    ).rejects.toThrow("Never-pull policies cannot be combined with Compose builds");
  });

  it.each([{ commandOptions: ["--build"] }, { commandOptions: ["--build=true"] }])(
    "should reject enabled Compose build options $commandOptions",
    async ({ commandOptions }) => {
      await expect(
        new DockerComposeEnvironment(fixtures, "docker-compose.yml")
          .withPullPolicy(PullPolicy.neverPull())
          .withClientOptions({ commandOptions })
          .up()
      ).rejects.toThrow("--build and --no-build are incompatible");
    }
  );

  it("should reject conflicting pull settings", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose.yml")
        .withPullPolicy({ shouldPull: () => true, neverPull: () => true })
        .up()
    ).rejects.toThrow("Image pull policy cannot enable both shouldPull() and neverPull()");
  });

  it("should start environment with multiple compose files", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-override");

    await using startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, [
      "docker-compose.yml",
      "docker-compose-update.yml",
    ]).up();
    await using container = startedEnvironment.getContainer("container-1");

    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };

    expect(responseBody["IS_OVERRIDDEN"]).toBe("true");
  });

  it("should support configuring a default wait strategy", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withDefaultWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
      .up(["container"]);

    await checkEnvironmentContainerIsHealthy(startedEnvironment, "container-1");
  });

  it("should wait for a healthcheck defined in a service", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(
      fixtures,
      "docker-compose-with-delayed-healthcheck.yml"
    ).up();
    const container = startedEnvironment.getContainer("container-1");

    expect(await getHealthCheckStatus(container)).toBe("healthy");
    await checkEnvironmentContainerIsHealthy(startedEnvironment, "container-1");
  });

  it("should support log message wait strategy", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withWaitStrategy("container-1", Wait.forLogMessage("Listening on port 8080"))
      .withWaitStrategy("another_container-1", Wait.forLogMessage("Listening on port 8080"))
      .up();

    await Promise.all(
      ["container-1", "another_container-1"].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );
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
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck.yml")
      .withWaitStrategy("container-1", Wait.forHealthCheck())
      .up();

    await checkEnvironmentContainerIsHealthy(startedEnvironment, "container-1");
  });

  it.sequential("should warn when no started containers match configured wait strategy names", async () => {
    const unmatchedWaitStrategyName = "non-existent-container-name";
    const warnSpy = vi.spyOn(log, "warn");

    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withWaitStrategy(unmatchedWaitStrategyName, Wait.forLogMessage("Listening on port 8080"))
      .up(["container"]);

    await checkEnvironmentContainerIsHealthy(startedEnvironment, "container-1");

    const warningMessages = warnSpy.mock.calls.map(([message]) => message);
    expect(
      warningMessages.some((warningMessage) =>
        warningMessage.includes(
          `No containers were started for the configured wait strategy names: "${unmatchedWaitStrategyName}"`
        )
      )
    ).toBe(true);
  });

  it("should support failing health check wait strategy", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck-unhealthy.yml")
        .withWaitStrategy("container-1", Wait.forHealthCheck())
        .up()
    ).rejects.toThrow(`Health check failed: unhealthy`);
  });

  it("should stop the container when the health check wait strategy times out", async () => {
    await expect(
      new DockerComposeEnvironment(fixtures, "docker-compose-with-healthcheck-with-start-period.yml")
        .withWaitStrategy("container-1", Wait.forHealthCheck())
        .withStartupTimeout(0)
        .up()
    ).rejects.toThrow(`Health check not healthy after 0ms`);

    expect(await getRunningContainerNames()).not.toContain("container-1");
  });

  it("should remove volumes when downing an environment", async () => {
    const environment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-volume.yml").up();

    await environment.down();

    const testVolumes = (await getVolumeNames()).filter((volumeName) => volumeName.includes("test-volume"));
    expect(testVolumes).toHaveLength(0);
  });

  it("should not wait for non-public ports", async () => {
    await using _ = await new DockerComposeEnvironment(fixtures, "docker-compose-with-private-port.yml").up();
  });

  it("should re-build the Dockerfiles", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withBuild()
      .up();

    await Promise.all(
      ["container-1", "another_container-1"].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );
  });

  it("should bind environment variables to the docker compose file", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-env.yml")
      .withEnvironment({ ENV_VAR: "ENV_VAR_VALUE" })
      .up();

    await using container = startedEnvironment.getContainer("container-1");
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };
    expect(responseBody["ENV_VAR"]).toBe("ENV_VAR_VALUE");
  });

  it("should throw error when you get container that does not exist", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();

    expect(() => startedEnvironment.getContainer("non_existent_container")).toThrow(
      `Cannot get container "non_existent_container" as it is not running`
    );
  });

  it("should support starting a subset of services defined in the docker-compose file", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(
      fixtures,
      "docker-compose-with-many-services.yml"
    ).up(["service-b"]);

    await checkEnvironmentContainerIsHealthy(startedEnvironment, "service-b-1");
    expect(() => startedEnvironment.getContainer("service-a")).toThrow(
      `Cannot get container "service-a" as it is not running`
    );
  });

  it("should not recreate the containers when no recreate option is set", async () => {
    {
      await using _ = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
        .withEnvironment({ CONTAINER_NAME: `custom_container_name_${randomUuid()}` })
        .withNoRecreate()
        .up();
    }
    await using _ = await new DockerComposeEnvironment(fixtures, "docker-compose-with-name.yml")
      .withEnvironment({ CONTAINER_NAME: `custom_container_name_${randomUuid()}` })
      .withNoRecreate()
      .up();
  });

  it("should load .env if no environment file option given", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-env-file");

    await using startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, "docker-compose.yml").up();

    await using container = startedEnvironment.getContainer("container-1");
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };
    expect(responseBody["ENV_VAR"]).toBe("default");
  });

  it("should load the values in the environment file if the environment file option is set", async () => {
    const overrideFixtures = path.resolve(fixtures, "docker-compose-with-env-file");

    await using startedEnvironment = await new DockerComposeEnvironment(overrideFixtures, "docker-compose.yml")
      .withEnvironmentFile(".env.override")
      .up();

    await using container = startedEnvironment.getContainer("container-1");
    const response = await fetch(`http://${container.getHost()}:${container.getMappedPort(8080)}/env`);
    const responseBody = (await response.json()) as { [key: string]: string };
    expect(responseBody["ENV_VAR"]).toBe("override");
  });

  it("should start containers with a profile if profile option is set", async () => {
    await using startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose-with-profile.yml")
      .withProfiles("debug")
      .up();

    await Promise.all(
      ["container-1", "another_container-1"].map(
        async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
      )
    );
  });

  it("should use a custom project name if set", async () => {
    const customProjectName = `custom-${new RandomUuid().nextUuid()}`;
    await using _ = await new DockerComposeEnvironment(fixtures, "docker-compose.yml")
      .withProjectName(customProjectName)
      .up();

    expect(await getRunningContainerNames()).toContain(`${customProjectName}-container-1`);
  });
});
