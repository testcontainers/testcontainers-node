import { GenericContainer } from "./generic-container/generic-container";
import {
  checkImageExists,
  composeContainerName,
  getContainerIds,
  getReaperContainerId,
  getRunningContainerNames,
  getRunningNetworkIds,
  stopReaper,
} from "./test-helper";
import { Network } from "./network";
import path from "path";
import { RandomUuid } from "./uuid";
import waitForExpect from "wait-for-expect";
import { DockerComposeEnvironment } from "./docker-compose-environment/docker-compose-environment";
import { sessionId } from "./docker/session-id";

const fixtures = path.resolve(__dirname, "..", "fixtures");

describe("Reaper", () => {
  jest.setTimeout(180_000);

  it("should remove containers", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    const reaperContainerId = await getReaperContainerId();
    await stopReaper();

    expect(await getContainerIds()).toContain(container.getId());
    await waitForExpect(async () => {
      expect(await getContainerIds()).not.toContain(container.getId());
      expect(await getContainerIds()).not.toContain(reaperContainerId);
    }, 30_000);
  });

  it("should not remove reusable containers", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withReuse().start();

    try {
      const runningContainerNames = await getRunningContainerNames();
      expect(runningContainerNames).not.toContain(`testcontainers-ryuk-${sessionId}`);
    } finally {
      await container.stop();
    }
  });

  it("should remove docker-compose containers", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(
      path.resolve(fixtures, "docker-compose"),
      "docker-compose.yml"
    ).up();
    const container = startedEnvironment.getContainer(await composeContainerName("container"));
    const anotherContainer = startedEnvironment.getContainer(await composeContainerName("another_container"));

    const reaperContainerId = await getReaperContainerId();
    await stopReaper();

    expect(await getContainerIds()).toContain(container.getId());
    expect(await getContainerIds()).toContain(anotherContainer.getId());
    await waitForExpect(async () => {
      expect(await getContainerIds()).not.toContain(container.getId());
      expect(await getContainerIds()).not.toContain(anotherContainer.getId());
      expect(await getContainerIds()).not.toContain(reaperContainerId);
    }, 30_000);
  });

  it("should remove networks", async () => {
    const network = await new Network().start();

    const reaperContainerId = await getReaperContainerId();
    await stopReaper();

    expect(await getRunningNetworkIds()).toContain(network.getId());
    await waitForExpect(async () => {
      expect(await getRunningNetworkIds()).not.toContain(network.getId());
      expect(await getContainerIds()).not.toContain(reaperContainerId);
    }, 30_000);
  });

  // https://github.com/containers/podman/issues/17614
  if (!process.env.CI_PODMAN) {
    it("should remove images", async () => {
      const imageName = `${new RandomUuid().nextUuid()}:${new RandomUuid().nextUuid()}`;
      const context = path.resolve(path.resolve(fixtures, "docker", "docker"));
      await GenericContainer.fromDockerfile(context).build(imageName);

      const reaperContainerId = await getReaperContainerId();
      await stopReaper();

      expect(await checkImageExists(imageName)).toBe(true);
      await waitForExpect(async () => {
        expect(await checkImageExists(imageName)).toBe(false);
        expect(await getContainerIds()).not.toContain(reaperContainerId);
      }, 30_000);
    });
  }
});
