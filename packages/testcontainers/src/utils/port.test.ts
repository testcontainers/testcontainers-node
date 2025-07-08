import { describe, expect, test } from "vitest";
import { getContainerPort, getProtocol, hasHostBinding } from "./port";

describe("port utilities", () => {
  describe("getContainerPort", () => {
    test("returns number as is", () => {
      expect(getContainerPort(8080)).toBe(8080);
    });

    test("parses port from string", () => {
      expect(getContainerPort("8080")).toBe(8080);
    });

    test("parses port from string with protocol", () => {
      expect(getContainerPort("8080/tcp")).toBe(8080);
      expect(getContainerPort("8080/udp")).toBe(8080);
    });

    test("returns container port from object", () => {
      expect(getContainerPort({ container: 8080, host: 49000 })).toBe(8080);
    });

    test("throws error for invalid port format", () => {
      expect(() => getContainerPort("invalid")).toThrow("Invalid port format: invalid");
    });
  });

  describe("hasHostBinding", () => {
    test("returns true for object with host binding", () => {
      expect(hasHostBinding({ container: 8080, host: 49000 })).toBe(true);
    });

    test("returns false for number", () => {
      expect(hasHostBinding(8080)).toBe(false);
    });

    test("returns false for string", () => {
      expect(hasHostBinding("8080")).toBe(false);
      expect(hasHostBinding("8080/tcp")).toBe(false);
    });
  });

  describe("getProtocol", () => {
    test("returns tcp for number", () => {
      expect(getProtocol(8080)).toBe("tcp");
    });

    test("returns tcp for string without protocol", () => {
      expect(getProtocol("8080")).toBe("tcp");
    });

    test("returns protocol from string", () => {
      expect(getProtocol("8080/tcp")).toBe("tcp");
      expect(getProtocol("8080/udp")).toBe("udp");
    });

    test("returns protocol from object", () => {
      expect(getProtocol({ container: 8080, host: 49000 })).toBe("tcp");
      expect(getProtocol({ container: 8080, host: 49000, protocol: "udp" })).toBe("udp");
    });

    test("handles protocol case-insensitively", () => {
      expect(getProtocol({ container: 8080, host: 49000, protocol: "TCP" })).toBe("tcp");
      expect(getProtocol({ container: 8080, host: 49000, protocol: "UDP" })).toBe("udp");
      expect(getProtocol("8080/TCP")).toBe("tcp");
      expect(getProtocol("8080/UDP")).toBe("udp");
    });

    test("maintains backward compatibility", () => {
      // Original usage patterns should still work
      expect(getProtocol(8080)).toBe("tcp"); // Number defaults to TCP
      expect(getProtocol("8080")).toBe("tcp"); // Simple string defaults to TCP
      expect(getProtocol({ container: 8080, host: 49000 })).toBe("tcp"); // Object without protocol defaults to TCP
    });

    test("supports protocol specification in all formats", () => {
      // New usage patterns with protocols
      expect(getProtocol("8080/udp")).toBe("udp"); // String with protocol
      expect(getProtocol({ container: 8080, host: 49000, protocol: "udp" })).toBe("udp"); // Object with protocol
    });

    test("note about UDP port checks", () => {
      // Note: While we support specifying UDP protocols for ports,
      // port availability checks for UDP ports are skipped since UDP
      // is connectionless and doesn't allow for the same verification
      // methods as TCP. The system will assume UDP ports are ready.
      expect(getProtocol("8080/udp")).toBe("udp");
    });
  });
});
