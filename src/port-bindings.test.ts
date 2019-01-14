import { PortBinder, PortBindings } from "./port-bindings";
import { FixedPortClient, PortClient } from "./port-client";

describe("PortBindings", () => {
    let portClient: PortClient;
    let portBindings: PortBindings;

    beforeEach(async () => {
        portClient = new FixedPortClient([1000, 2000]);
        portBindings = await new PortBinder(portClient).bind([1, 2]);
    });

    it("should get mapped port", async () => {
        expect(portBindings.getMappedPort(1)).toBe(1000);
        expect(portBindings.getMappedPort(2)).toBe(2000);
    });

    it("should throw if unbound port mapping requested", async () => {
        expect(() => portBindings.getMappedPort(3)).toThrow();
    });

    it("should get exposed ports", async () => {
        expect(portBindings.getExposedPorts()).toEqual({ 1: {}, 2: {} });
    });

    it("should get port bindings", async () => {
        expect(portBindings.getPortBindings()).toEqual({ 1: [{ HostPort: "1000" }], 2: [{ HostPort: "2000" }] });
    });
});
