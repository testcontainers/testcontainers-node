import path from "path";
import { GenericContainer } from "./generic-container";
import { AlwaysPullPolicy } from "../pull-policy";
import { Wait } from "../wait-strategy/wait";
import { checkContainerIsHealthy, waitForDockerEvent } from "../test-helper";

describe("GenericContainer Dockerfile", () => {
  jest.setTimeout(180_000);

  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should build and start", async () => {
    const context = path.resolve(fixtures, "docker");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);

    await startedContainer.stop();
  });

  // https://github.com/containers/podman/issues/17779
  if (!process.env["CI_PODMAN"]) {
    it("should use pull policy", async () => {
      const dockerfile = path.resolve(fixtures, "docker");
      const containerSpec = GenericContainer.fromDockerfile(dockerfile).withPullPolicy(new AlwaysPullPolicy());

      await containerSpec.build();
      const dockerPullEventPromise = waitForDockerEvent("pull");
      await containerSpec.build();
      await dockerPullEventPromise;
    });
  }

  it("should build and start with custom file name", async () => {
    const context = path.resolve(fixtures, "docker-with-custom-filename");
    const container = await GenericContainer.fromDockerfile(context, "Dockerfile-A").build();
    const startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);

    await startedContainer.stop();
  });

  it("should set build arguments", async () => {
    const context = path.resolve(fixtures, "docker-with-buildargs");
    const container = await GenericContainer.fromDockerfile(context).withBuildArgs({ VERSION: "10-alpine" }).build();
    const startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);

    await startedContainer.stop();
  });

  it("should exit immediately and stop without exception", async () => {
    const message = "This container will exit immediately.";
    const context = path.resolve(fixtures, "docker-exit-immediately");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = await container.withWaitStrategy(Wait.forLogMessage(message)).start();

    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    await startedContainer.stop();
  });
});
