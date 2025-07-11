import { HostIp } from "../container-runtime";
import { InspectResult } from "../types";
import { BoundPorts, resolveHostPortBinding } from "./bound-ports";

describe("BoundPorts", () => {
  it("should return a binding", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding(1, 1000);

    expect(boundPorts.getBinding(1)).toBe(1000);
  });

  it("should return a binding with protocol", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding(1, 1000, "tcp");
    boundPorts.setBinding(1, 2000, "udp");

    // Default protocol is tcp
    expect(boundPorts.getBinding(1)).toBe(1000);
    // Can explicitly specify protocol
    expect(boundPorts.getBinding(1, "tcp")).toBe(1000);
    expect(boundPorts.getBinding(1, "udp")).toBe(2000);
  });

  it("should accept string port keys", () => {
    const boundPorts = new BoundPorts();
    boundPorts.setBinding("8080/tcp", 1000);
    boundPorts.setBinding("8080/udp", 2000);

    expect(boundPorts.getBinding("8080/tcp")).toBe(1000);
    expect(boundPorts.getBinding("8080/udp")).toBe(2000);
    // Can also specify as number + protocol
    expect(boundPorts.getBinding(8080, "tcp")).toBe(1000);
    expect(boundPorts.getBinding(8080, "udp")).toBe(2000);
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
        expect(internalPort).toBe("1/tcp");
        expect(hostPort).toBe(1000);
      }
    });

    it("should instantiate from an inspect result", () => {
      const inspectResult: Partial<InspectResult> = {
        ports: {
          "8080/tcp": [{ hostIp: "0.0.0.0", hostPort: 10000 }],
          "8081/tcp": [{ hostIp: "0.0.0.0", hostPort: 10001 }],
          "8080/udp": [{ hostIp: "0.0.0.0", hostPort: 10002 }],
        },
      };
      const hostIps: HostIp[] = [{ address: "127.0.0.1", family: 4 }];

      const boundPorts = BoundPorts.fromInspectResult(hostIps, inspectResult as InspectResult);

      // Default to TCP
      expect(boundPorts.getBinding(8080)).toBe(10000);
      expect(boundPorts.getBinding(8081)).toBe(10001);
      // Explicitly specify protocol
      expect(boundPorts.getBinding(8080, "tcp")).toBe(10000);
      expect(boundPorts.getBinding(8080, "udp")).toBe(10002);
    });

    it("should filter port bindings", () => {
      const boundPorts = new BoundPorts();
      boundPorts.setBinding(1, 1000);
      boundPorts.setBinding(2, 2000);

      const filtered = boundPorts.filter([2]);

      expect(() => filtered.getBinding(1)).toThrowError("No port binding found for :1");
      expect(filtered.getBinding(2)).toBe(2000);
    });

    it("should filter port bindings with protocols", () => {
      const boundPorts = new BoundPorts();
      boundPorts.setBinding(8080, 1000, "tcp");
      boundPorts.setBinding(8080, 2000, "udp");
      boundPorts.setBinding(9090, 3000, "tcp");

      // Create a simplified filter test
      let filtered = boundPorts.filter([8080]); // Just filter TCP port

      // Should only include the TCP binding
      expect(filtered.getBinding(8080)).toBe(1000);
      expect(() => filtered.getBinding(8080, "udp")).toThrowError("No port binding found for :8080/udp");
      expect(() => filtered.getBinding(9090)).toThrowError("No port binding found for :9090/tcp");

      // Now filter only the UDP port
      filtered = boundPorts.filter(["8080/udp"]);

      // Should only include the UDP binding
      expect(filtered.getBinding(8080, "udp")).toBe(2000);
      expect(() => filtered.getBinding(8080, "tcp")).toThrowError("No port binding found for :8080/tcp");
    });

    it("should handle case-insensitive protocols", () => {
      const boundPorts = new BoundPorts();
      boundPorts.setBinding(8080, 1000, "tcp");

      // Should be able to retrieve with uppercase protocol
      expect(boundPorts.getBinding(8080, "TCP")).toBe(1000);

      // Also works with uppercase in the key
      boundPorts.setBinding("9090/TCP", 2000);
      expect(boundPorts.getBinding(9090, "tcp")).toBe(2000);
      expect(boundPorts.getBinding("9090/tcp")).toBe(2000);
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
