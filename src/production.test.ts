import path from "path";
import { DockerComposeEnvironment, GenericContainer, Network } from "./index";
import { checkContainerIsHealthy, checkEnvironmentContainerIsHealthy } from "./test-helper";
import { getContainerById } from "./docker/functions/container/get-container";

describe("Production", () => {
  jest.setTimeout(180_000);

  it("generic container works", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  // it("docker compose works", async () => {
  //   const fixtures = path.resolve(__dirname, "..", "fixtures", "docker-compose");
  //   const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up();
  //
  //   await Promise.all(
  //     ["container_1", "another_container_1"].map(
  //       async (containerName) => await checkEnvironmentContainerIsHealthy(startedEnvironment, containerName)
  //     )
  //   );
  //
  //   await startedEnvironment.down();
  // });

  it("network works", async () => {
    const network = await new Network().start();

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withNetwork(network).start();

    const dockerContainer = await getContainerById(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.NetworkMode).toBe(network.getName());

    await container.stop();
    await network.stop();
  });
});
