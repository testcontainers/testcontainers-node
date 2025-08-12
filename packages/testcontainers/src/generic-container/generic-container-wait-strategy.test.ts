import path from "path";
import { HealthCheckWaitStrategy } from "../wait-strategies/health-check-wait-strategy";
import { HostPortWaitStrategy } from "../wait-strategies/host-port-wait-strategy";
import { Wait } from "../wait-strategies/wait";
import { GenericContainer } from "./generic-container";
import { StartedGenericContainer } from "./started-generic-container";

const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

if (!process.env.CI_PODMAN) {
  describe("GenericContainer wait strategy", { timeout: 180_000 }, () => {
    it("should use Wait.forListeningPorts if healthcheck is not defined in DOCKERFILE", async () => {
      await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .start();
      expect((container as StartedGenericContainer)["getWaitStrategy"]()).toBeInstanceOf(HostPortWaitStrategy);
    });
    it("should use Wait.forHealthCheck if withHealthCheck() explicitly called", async () => {
      await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withHealthCheck({
          test: ["CMD-SHELL", "echo 'started' && exit 0"],
        })
        .start();
      expect((container as StartedGenericContainer)["getWaitStrategy"]()).toBeInstanceOf(HealthCheckWaitStrategy);
    });
    it("should use Wait.forHealthCheck if healthcheck is defined in DOCKERFILE", async () => {
      const context = path.resolve(fixtures, "docker-with-health-check");
      const genericContainer = await GenericContainer.fromDockerfile(context).build();
      await using startedContainer = await genericContainer.start();
      expect((startedContainer as StartedGenericContainer)["getWaitStrategy"]()).toBeInstanceOf(
        HealthCheckWaitStrategy
      );
    });
    it("should use same WaitStrategy if it's explicitly defined in withWaitStrategy() even if image defines healthcheck", async () => {
      const context = path.resolve(fixtures, "docker-with-health-check");
      const genericContainer = await GenericContainer.fromDockerfile(context).build();
      await using container = await genericContainer
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forListeningPorts())
        .start();
      expect((container as StartedGenericContainer)["getWaitStrategy"]()).toBeInstanceOf(HostPortWaitStrategy);
    });
    it("should use same WaitStrategy if it's explicitly defined in withWaitStrategy() even if withHealthCheck() is called", async () => {
      await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withHealthCheck({
          test: ["CMD-SHELL", "echo 'started' && exit 0"],
        })
        .withWaitStrategy(Wait.forListeningPorts())
        .start();
      expect((container as StartedGenericContainer)["getWaitStrategy"]()).toBeInstanceOf(HostPortWaitStrategy);
    });
  });
}
