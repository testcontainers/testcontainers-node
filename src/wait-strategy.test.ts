import { Container } from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import { ContainerState } from "./container-state";
import { FakeDockerClient } from "./docker-client";
import { PortBindings } from "./port-bindings";
import { BusyPortCheckClient } from "./port-check-client";
import { HostPortWaitStrategy } from "./wait-strategy";

describe("WaitStrategy", () => {
  describe("HostPortWaitStrategy", () => {
    it("should resolve if internal and external ports are listening", async () => {
      const container = {} as Container;
      const execResult = { exitCode: 0, output: "" };
      const dockerClient = new FakeDockerClient(container, execResult);
      const portCheckClient = new BusyPortCheckClient();

      const promise = new HostPortWaitStrategy(dockerClient, portCheckClient)
        .withStartupTimeout(new Duration(1, TemporalUnit.SECONDS))
        .waitUntilReady(container, createContainerState());

      await expect(promise).resolves.toBeUndefined();
    });
  });

  function createContainerState(): ContainerState {
    const portBindings = new PortBindings();
    portBindings.setBinding(1, 1000);

    return new ContainerState(portBindings);
  }
});
