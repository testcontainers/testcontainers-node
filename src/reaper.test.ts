import { GenericContainer } from "./generic-container/generic-container";
import { getReaperContainerId, getContainerIds, getRunningNetworkIds, stopReaper } from "./test-helper";
import { Network } from "./network";
import path from "path";
import { RandomUuid } from "./uuid";
import waitForExpect from "wait-for-expect";
import { listImages } from "./docker/functions/image/list-images";
import { DockerImageName } from "./docker-image-name";
import { DockerComposeEnvironment } from "./docker-compose-environment/docker-compose-environment";
import { dockerClient } from "./docker/docker-client";

const fixtures = path.resolve(__dirname, "..", "fixtures");

describe("Reaper", () => {
  jest.setTimeout(180_000);

  it("should remove containers", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12").start();

    const reaperContainerId = await getReaperContainerId();
    await stopReaper();

    expect(await getContainerIds()).toContain(container.getId());
    await waitForExpect(async () => {
      expect(await getContainerIds()).not.toContain(container.getId());
      expect(await getContainerIds()).not.toContain(reaperContainerId);
    }, 30_000);
  });

  it("should remove docker-compose containers", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(
      path.resolve(fixtures, "docker-compose"),
      "docker-compose.yml"
    ).up();
    const container = startedEnvironment.getContainer("container_1");
    const anotherContainer = startedEnvironment.getContainer("another_container_1");

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

  it("should remove images", async () => {
    const imageId = `${new RandomUuid().nextUuid()}:${new RandomUuid().nextUuid()}`;
    const context = path.resolve(path.resolve(fixtures, "docker", "docker"));
    await GenericContainer.fromDockerfile(context).build(imageId);

    const reaperContainerId = await getReaperContainerId();
    await stopReaper();

    const { dockerode } = await dockerClient();
    expect(await listImages(dockerode)).toContainEqual(DockerImageName.fromString(imageId));
    await waitForExpect(async () => {
      expect(await listImages(dockerode)).not.toContainEqual(DockerImageName.fromString(imageId));
      expect(await getContainerIds()).not.toContain(reaperContainerId);
    }, 30_000);
  });
});
