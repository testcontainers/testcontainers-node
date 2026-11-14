import { getContainerRuntimeClient } from "../container-runtime";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer pause", { timeout: 180_000 }, () => {
  it("should pause and unpause", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .start();
    const client = await getContainerRuntimeClient();
    const dockerContainer = client.container.getById(container.getId());

    await container.pause();
    expect((await client.container.inspect(dockerContainer)).State.Paused).toBe(true);

    await container.unpause();
    expect((await client.container.inspect(dockerContainer)).State.Paused).toBe(false);
    await checkContainerIsHealthy(container);
  });
});
