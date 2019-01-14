import { PortBinder, PortBindings } from "./port-bindings";
import { FixedPortClient } from "./port-client";

describe("PortBindings", () => {
  it("should return a binding", () => {
    const portBindings = new PortBindings();
    portBindings.setBinding(1, 1000);
    expect(portBindings.getBinding(1)).toBe(1000);
  });

  it("should return host ports", () => {
    const portBindings = new PortBindings();
    portBindings.setBinding(1, 1000);
    expect(portBindings.getHostPorts()).toEqual([1000]);
  });

  it("should return an iterator for all bindings", () => {
    const portBindings = new PortBindings();
    portBindings.setBinding(1, 1000);

    for (const [internalPort, hostPort] of portBindings.iterator()) {
      expect(internalPort).toBe(1);
      expect(hostPort).toBe(1000);
    }
  });

  describe("PortBinder", () => {
    it("should bind each port to the host", async () => {
      const portClient = new FixedPortClient([1000, 2000]);
      const portBinder = new PortBinder(portClient);

      const portBindings = await portBinder.bind([1, 2]);

      expect(portBindings.getBinding(1)).toBe(1000);
      expect(portBindings.getBinding(2)).toBe(2000);
    });
  });
});
