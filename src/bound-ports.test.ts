import { BoundPorts } from "./bound-ports";

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
});
