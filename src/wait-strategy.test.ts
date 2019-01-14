import { Duration, TemporalUnit } from "node-duration";
import { RotatingClock } from "./clock";
import { ContainerState } from "./container-state";
import { PortBindings } from "./port-bindings";
import { BusyPortCheckClient, FreePortCheckClient } from "./port-check-client";
import { HostPortWaitStrategy } from "./wait-strategy";

describe("WaitStrategy", () => {
  describe("HostPortWaitStrategy", () => {
    it("should resolve if external port is listening", async () => {
      const promise = new HostPortWaitStrategy(new BusyPortCheckClient())
        .withStartupTimeout(new Duration(1, TemporalUnit.SECONDS))
        .waitUntilReady(createContainerState());

      await expect(promise).resolves.toBeUndefined();
    });

    it("should reject if external port is not listening after startupTimeout", async () => {
      const promise = new HostPortWaitStrategy(new FreePortCheckClient(), new RotatingClock([0, 1000, 1001]))
        .withStartupTimeout(new Duration(1, TemporalUnit.SECONDS))
        .waitUntilReady(createContainerState());

      await expect(promise).rejects.toThrowError(`Port :1000 not bound after 1000ms`);
    });
  });

  function createContainerState(): ContainerState {
    const portBindings = new PortBindings();
    portBindings.setBinding(1, 1000);

    return new ContainerState(portBindings);
  }
});
