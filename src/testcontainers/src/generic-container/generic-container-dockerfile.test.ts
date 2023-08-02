import path from "path";
import { GenericContainer, Wait, PullPolicy } from "testcontainers";
import { RandomUuid } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import {
  checkContainerIsHealthy,
  deleteImageByName,
  getDockerEventStream,
  getImageLabelsByName,
  waitForDockerEvent,
} from "../utils/test-helper";

describe("GenericContainer Dockerfile", () => {
  jest.setTimeout(180_000);

  const uuidGen = new RandomUuid();
  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should build and start", async () => {
    const context = path.resolve(fixtures, "docker");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);

    await startedContainer.stop();
  });

  it("should have a session ID label to be cleaned up by the Reaper", async () => {
    const context = path.resolve(fixtures, "docker");
    const imageName = `${uuidGen.nextUuid()}:${uuidGen.nextUuid()}`;

    await GenericContainer.fromDockerfile(context).build(imageName);

    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);
    const imageLabels = await getImageLabelsByName(imageName);
    expect(imageLabels[LABEL_TESTCONTAINERS_SESSION_ID]).toEqual(reaper.sessionId);

    await deleteImageByName(imageName);
  });

  it("should not have a session ID label when delete on exit set to false", async () => {
    const context = path.resolve(fixtures, "docker");
    const imageName = `${uuidGen.nextUuid()}:${uuidGen.nextUuid()}`;

    await GenericContainer.fromDockerfile(context).build(imageName, { deleteOnExit: false });

    const imageLabels = await getImageLabelsByName(imageName);
    expect(imageLabels[LABEL_TESTCONTAINERS_SESSION_ID]).toBeUndefined();

    await deleteImageByName(imageName);
  });

  // https://github.com/containers/podman/issues/17779
  if (!process.env.CI_PODMAN) {
    it("should use pull policy", async () => {
      const dockerfile = path.resolve(fixtures, "docker");
      const containerSpec = GenericContainer.fromDockerfile(dockerfile).withPullPolicy(PullPolicy.alwaysPull());

      await containerSpec.build();
      const dockerEventStream = await getDockerEventStream();
      const dockerPullEventPromise = waitForDockerEvent(dockerEventStream, "pull");
      await containerSpec.build();
      await dockerPullEventPromise;

      dockerEventStream.destroy();
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
