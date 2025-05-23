import { HostIp } from "../container-runtime";
import { InspectResult } from "../types";
import { BoundPorts, resolveHostPortBinding } from "./bound-ports";

describe("BoundPorts", () => {
  it("should return a binding", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding(1, 1000);

    expect(boundPorts.getBinding(1)).toBe(1000);
  });

  describe("BoundPorts", () => {
    it("should return a binding", () => {
      const boundPorts = new BoundPorts();
      boundPorts.setBinding(1, 1000);

      expect(boundPorts.getBinding(1)).toBe(1000);
    });

    describe("get first binding", () => {
      it("should return", () => {
        const boundPorts = new BoundPorts();
        boundPorts.setBinding(1, 1000);

        expect(boundPorts.getFirstBinding()).toBe(1000);
      });

      it("should throw when not set", () => {
        const boundPorts = new BoundPorts();

        expect(() => boundPorts.getFirstBinding()).toThrowError("No port bindings found");
      });
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
      const hostIps: HostIp[] = [{ address: "127.0.0.1", family: 4 }];

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

  describe("resolveHostPortBinding", () => {
    it("should return IPv6-mapped host port when preferred", () => {
      const hostIps: HostIp[] = [
        { address: "::1", family: 6 },
        { address: "127.0.0.1", family: 4 },
      ];
      const ports = [
        { hostIp: "0.0.0.0", hostPort: 50000 },
        { hostIp: "::", hostPort: 50001 },
      ];
      expect(resolveHostPortBinding(hostIps, ports)).toBe(50001);
    });

    it("should return IPv4-mapped host port when preferred", () => {
      const hostIps: HostIp[] = [
        { address: "127.0.0.1", family: 4 },
        { address: "::1", family: 6 },
      ];
      const ports = [
        { hostIp: "0.0.0.0", hostPort: 50000 },
        { hostIp: "::", hostPort: 50001 },
      ];
      expect(resolveHostPortBinding(hostIps, ports)).toBe(50000);
    });

    // https://github.com/containers/podman/issues/17780
    it("should return mapped host port when dual stack IP", () => {
      const hostIps: HostIp[] = [
        { address: "127.0.0.1", family: 4 },
        { address: "::1", family: 6 },
      ];
      const ports = [{ hostIp: "", hostPort: 50000 }];
      expect(resolveHostPortBinding(hostIps, ports)).toBe(50000);
    });

    it("should throw when no host port available for host IP family", () => {
      const hostIps: HostIp[] = [{ address: "::1", family: 6 }];
      const ports = [{ hostIp: "0.0.0.0", hostPort: 50000 }];
      expect(() => resolveHostPortBinding(hostIps, ports)).toThrow("No host port found for host IP");
    });
  });
});
