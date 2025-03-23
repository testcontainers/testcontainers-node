import path from "path";
import { RandomUuid } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { checkContainerIsHealthy, deleteImageByName, getImageLabelsByName } from "../utils/test-helper";
import { Wait } from "../wait-strategies/wait";
import { GenericContainer } from "./generic-container";

describe("GenericContainer Dockerfile", { timeout: 180_000 }, () => {
  const uuidGen = new RandomUuid();
  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should build and start", async () => {
    const context = path.resolve(fixtures, "docker");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);

    await startedContainer.stop();
  });

  it("should build and start with buildkit", async () => {
    const context = path.resolve(fixtures, "docker-with-buildkit");
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
