import { BoundPorts, PortBinder } from "./bound-ports";
import { FixedPortClient } from "./port-client";

describe("BoundPorts", () => {
  it("should return a binding", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding(1, 1000);

    expect(boundPorts.getBinding(1)).toBe(1000);
  });

  it("should return an iterator for all bindings", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding(1, 1000);

    for (const [internalPort, hostPort] of boundPorts.iterator()) {
      expect(internalPort).toBe(1);
      expect(hostPort).toBe(1000);
    }
  });

  describe("PortBinder", () => {
    it("should bind each port to the host", async () => {
      const portClient = new FixedPortClient([1000, 2000]);
      const portBinder = new PortBinder(portClient);

      const boundPorts = await portBinder.bind([1, 2]);

      expect(boundPorts.getBinding(1)).toBe(1000);
      expect(boundPorts.getBinding(2)).toBe(2000);
    });
  });
});
