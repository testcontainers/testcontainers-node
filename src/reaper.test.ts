import { GenericContainer } from "./generic-container";
import { ReaperInstance } from "./reaper";
import { getImagesRepoTags, getRunningContainerIds, getRunningNetworkIds } from "./test-helper";
import { Network } from "./network";
import Dockerode from "dockerode";
import path from "path";
import { RandomUuid } from "./uuid";

const dockerode = new Dockerode();

describe("Reaper", () => {
  jest.setTimeout(60_000);

  it("should remove containers", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12").start();

    await ReaperInstance.stopInstance();

    expect(await getRunningContainerIds(dockerode)).toContain(container.getId());
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    expect(await getRunningContainerIds(dockerode)).not.toContain(container.getId());
  });

  it("should remove networks", async () => {
    const network = await new Network().start();

    await ReaperInstance.stopInstance();

    expect(await getRunningNetworkIds(dockerode)).toContain(network.getId());
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    expect(await getRunningNetworkIds(dockerode)).not.toContain(network.getId());
  });

  it("should remove images", async () => {
    const imageId = `${new RandomUuid().nextUuid()}:${new RandomUuid().nextUuid()}`;
    const context = path.resolve(__dirname, "..", "fixtures", "docker", "docker");
    await GenericContainer.fromDockerfile(context).build(imageId);

    await ReaperInstance.stopInstance();

    expect(await getImagesRepoTags(dockerode)).toContain(imageId);
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    expect(await getImagesRepoTags(dockerode)).not.toContain(imageId);
  });
});
