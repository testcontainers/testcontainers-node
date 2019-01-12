import { PortBindings, StartedPortBindings } from "./port-bindings";
import { FixedSocketClient, SocketClient } from "./socket-client";

describe("PortBindings", () => {
    let socketClient: SocketClient;
    let portBindings: StartedPortBindings;

    beforeEach(async () => {
        socketClient = new FixedSocketClient([1000, 2000]);
        portBindings = await new PortBindings(socketClient).bind([1, 2]);
    });

    it("should get mapped port", async () => {
        expect(portBindings.getMappedPort(1)).toBe(1000);
        expect(portBindings.getMappedPort(2)).toBe(2000);
    });

    it("should get exposed ports", async () => {
        expect(portBindings.getExposedPorts()).toEqual({ 1: {}, 2: {} });
    });

    it("should get port bindings", async () => {
        expect(portBindings.getPortBindings()).toEqual({ 1: [{ HostPort: "1000" }], 2: [{ HostPort: "2000" }] });
    });
});
