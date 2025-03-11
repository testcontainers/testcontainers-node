import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { GenericContainer } from "./generic-container";

describe("GenericContainer resources quota", { timeout: 180_000 }, () => {
  let client: ContainerRuntimeClient;

  beforeAll(async () => {
    client = await getContainerRuntimeClient();
  });

  if (!process.env["CI_ROOTLESS"]) {
    it("should set resources quota", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withResourcesQuota({ memory: 0.5, cpu: 1 })
        .start();

      const dockerContainer = await client.container.getById(container.getId());
      const containerInfo = await dockerContainer.inspect();

      expect(containerInfo.HostConfig.Memory).toEqual(536870912);
      expect(containerInfo.HostConfig.NanoCpus).toEqual(1000000000);

      await container.stop();
    });
  }

  it("resources quota should be 0 for cpu and memory if not set by user", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    const dockerContainer = await client.container.getById(container.getId());
    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.Memory).toEqual(0);
    expect(containerInfo.HostConfig.NanoCpus).toEqual(0);

    await container.stop();
  });

  it("should set resources quota memory only, cpu should be 0", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withResourcesQuota({ memory: 0.5 })
      .start();

    const dockerContainer = await client.container.getById(container.getId());
    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.Memory).toEqual(536870912);
    expect(containerInfo.HostConfig.NanoCpus).toEqual(0);

    await container.stop();
  });

  if (!process.env["CI_ROOTLESS"]) {
    it("should set resources quota cpu only, memory should be 0", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withResourcesQuota({ cpu: 1 })
        .start();

      const dockerContainer = await client.container.getById(container.getId());
      const containerInfo = await dockerContainer.inspect();

      expect(containerInfo.HostConfig.Memory).toEqual(0);
      expect(containerInfo.HostConfig.NanoCpus).toEqual(1000000000);

      await container.stop();
    });
  }
});
