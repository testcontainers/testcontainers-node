import { BoundPorts } from "./bound-ports";
import { InspectResult } from "./docker/functions/container/inspect-container";
import { HostIps } from "./docker/lookup-host-ips";

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

  it("should instantiate from an inspect result", () => {
    const inspectResult: Partial<InspectResult> = {
      ports: {
        8080: [{ hostIp: "0.0.0.0", hostPort: 10000 }],
        8081: [{ hostIp: "0.0.0.0", hostPort: 10001 }],
      },
    };
    const hostIps: HostIps = [{ address: "127.0.0.1", family: 4 }];

    const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult as InspectResult);

    expect(boundPorts.getBinding(8080)).toBe(10000);
    expect(boundPorts.getBinding(8081)).toBe(10001);
  });

  it("should filter port bindings", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding(1, 1000);
    boundPorts.setBinding(2, 2000);

    const filtered = boundPorts.filter([2]);

    expect(() => filtered.getBinding(1)).toThrowError("No port binding found for :1");
    expect(filtered.getBinding(2)).toBe(2000);
  });
});
