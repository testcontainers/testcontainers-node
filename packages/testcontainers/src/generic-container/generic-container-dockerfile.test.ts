import path from "path";
import { RandomUuid } from "../common";
import * as containerRuntime from "../container-runtime";
import { getContainerRuntimeClient, ImageName } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { PullPolicy } from "../utils/pull-policy";
import {
  checkContainerIsHealthy,
  deleteImageByName,
  getDockerEventStream,
  getImageLabelsByName,
  waitForDockerEvent,
} from "../utils/test-helper";
import { Wait } from "../wait-strategies/wait";
import { GenericContainer } from "./generic-container";

describe("GenericContainer Dockerfile", { timeout: 180_000 }, () => {
  const uuidGen = new RandomUuid();
  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should build and start", async () => {
    const context = path.resolve(fixtures, "docker");
    const container = await GenericContainer.fromDockerfile(context).build();
    await using startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);
  });

  if (!process.env.CI_PODMAN) {
    it("should build with buildkit", async () => {
      const context = path.resolve(fixtures, "docker-with-buildkit");
      const container = await GenericContainer.fromDockerfile(context).withBuildkit().build();
      await using startedContainer = await container.withExposedPorts(8080).start();

      await checkContainerIsHealthy(startedContainer);
    });
  }

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
      await using dockerEventStream = await getDockerEventStream();
      const dockerPullEventPromise = waitForDockerEvent(dockerEventStream.events, "pull");
      await containerSpec.build();
      await dockerPullEventPromise;
    });

    it("should not pull existing image without pull policy", async () => {
      const client = await getContainerRuntimeClient();
      await client.image.pull(new ImageName("docker.io", "node", "10-alpine"));

      const dockerfile = path.resolve(fixtures, "docker");
      const containerSpec = GenericContainer.fromDockerfile(dockerfile);

      await containerSpec.build();
      await using dockerEventStream = await getDockerEventStream();
      const dockerPullEventPromise = waitForDockerEvent(dockerEventStream.events, "pull");
      let hasResolved = false;
      dockerPullEventPromise.then(() => (hasResolved = true));
      await containerSpec.build();

      expect(hasResolved).toBeFalsy();
    });
  }

  for (const buildkit of [false, true]) {
    it(
      `should reject never-pull before contacting the runtime with buildkit=${buildkit}`,
      { concurrent: false },
      async () => {
        const clientSpy = vi.spyOn(containerRuntime, "getContainerRuntimeClient");
        const builder = GenericContainer.fromDockerfile(path.resolve(fixtures, "docker")).withPullPolicy(
          PullPolicy.neverPull()
        );
        if (buildkit) {
          builder.withBuildkit();
        }

        await expect(builder.build()).rejects.toThrow("Never-pull policies are not supported for Dockerfile builds");
        expect(clientSpy).not.toHaveBeenCalled();
      }
    );
  }

  it("should reject conflicting pull settings before contacting the runtime", { concurrent: false }, async () => {
    const clientSpy = vi.spyOn(containerRuntime, "getContainerRuntimeClient");

    await expect(
      GenericContainer.fromDockerfile(path.resolve(fixtures, "docker"))
        .withPullPolicy({ shouldPull: () => true, neverPull: () => true })
        .build()
    ).rejects.toThrow("Image pull policy cannot enable both shouldPull() and neverPull()");
    expect(clientSpy).not.toHaveBeenCalled();
  });

  it("should build and start with custom file name", async () => {
    const context = path.resolve(fixtures, "docker-with-custom-filename");
    const container = await GenericContainer.fromDockerfile(context, "Dockerfile-A").build();
    await using startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);
  });

  it("should set build arguments", async () => {
    const context = path.resolve(fixtures, "docker-with-buildargs");
    const container = await GenericContainer.fromDockerfile(context).withBuildArgs({ VERSION: "10-alpine" }).build();
    await using startedContainer = await container.withExposedPorts(8080).start();

    await checkContainerIsHealthy(startedContainer);
  });

  it("should exit immediately and stop without exception", async () => {
    const message = "This container will exit immediately.";
    const context = path.resolve(fixtures, "docker-exit-immediately");
    const container = await GenericContainer.fromDockerfile(context).build();
    await using _ = await container.withWaitStrategy(Wait.forLogMessage(message)).start();

    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  });
});
