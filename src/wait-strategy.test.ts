import { ContainerState } from "./container-state";
import { FakePortBindings, PortMap } from "./port-bindings";
import { HostPortWaitStrategy } from "./wait-strategy";

describe("WaitStrategy", () => {
    describe("HostPortWaitStrategy", () => {
        it("should resolve if external port is listening", async () => {
            const portMap = new PortMap();
            const containerExposedPorts = {};
            const containerPortBindings = {};
            const portBindings = new FakePortBindings(portMap, containerExposedPorts, containerPortBindings);
            const containerState = new ContainerState(portBindings);

            const strategy = new HostPortWaitStrategy();

            strategy.waitUntilReady(containerState);
        });

        it("should reject is external port is not listening after startupTimeout", async () => {});
    });
});
