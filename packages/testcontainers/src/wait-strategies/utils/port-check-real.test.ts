import path from "path";
import { getContainerRuntimeClient } from "../../container-runtime";
import { GenericContainer } from "../../generic-container/generic-container";
import { checkContainerIsHealthy } from "../../utils/test-helper";
import { Wait } from "../wait";
import { InternalPortCheck } from "./port-check";

describe("PortCheck", { timeout: 120_000 }, () => {
  describe("InternalPortCheck", () => {
    it("should work on container with shell", async () => {
      const client = await getContainerRuntimeClient();
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/Listening on port 8080/))
        .start();

      await checkContainerIsHealthy(container);

      const lowerLevelContainer = client.container.dockerode.getContainer(container.getId());
      const portCheck = new InternalPortCheck(client, lowerLevelContainer);

      const isBound = await portCheck.isBound(8080);
      expect(isBound).toBeTruthy();

      await container.stop();
    });

    const fixtures = path.resolve(__dirname, "..", "..", "..", "fixtures", "docker");
    it("should fail on container without shell (distroless)", async () => {
      const context = path.resolve(fixtures, "docker-no-shell");
      const container = await GenericContainer.fromDockerfile(context).build();
      const startedContainer = await container
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/Listening on port 8080/))
        .start();

      await checkContainerIsHealthy(startedContainer);

      const client = await getContainerRuntimeClient();
      const lowerLevelContainer = client.container.dockerode.getContainer(startedContainer.getId());
      const portCheck = new InternalPortCheck(client, lowerLevelContainer);

      const isBound = await portCheck.isBound(8080);
      expect(isBound).toBeFalsy();

      await startedContainer.stop();
    });
  });
});
