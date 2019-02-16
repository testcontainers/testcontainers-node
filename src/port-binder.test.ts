import { PortBinder } from "./port-binder";
import { FixedPortClient } from "./port-client";

describe("PortBinder", () => {
  it("should bind each port to the host", async () => {
    const portClient = new FixedPortClient([1000, 2000]);
    const portBinder = new PortBinder(portClient);

    const boundPorts = await portBinder.bind([1, 2]);

    expect(boundPorts.getBinding(1)).toBe(1000);
    expect(boundPorts.getBinding(2)).toBe(2000);
  });
});
