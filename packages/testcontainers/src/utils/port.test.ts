import { describe, expect } from "vitest";
import { getContainerPort, getProtocol, hasHostBinding } from "./port";

describe("port utilities", () => {
  describe("getContainerPort", () => {
    it("returns number as is", () => {
      expect(getContainerPort(8080)).toBe(8080);
    });

    it("parses port from string", () => {
      expect(getContainerPort("8080")).toBe(8080);
    });

    it("parses port from string with protocol", () => {
      expect(getContainerPort("8080/tcp")).toBe(8080);
      expect(getContainerPort("8080/udp")).toBe(8080);
    });

    it("returns container port from object", () => {
      expect(getContainerPort({ container: 8080, host: 49000 })).toBe(8080);
    });

    it("throws error for invalid port format", () => {
      expect(() => getContainerPort("invalid")).toThrow("Invalid port format: invalid");
    });
  });

  describe("hasHostBinding", () => {
    it("returns true for object with host binding", () => {
      expect(hasHostBinding({ container: 8080, host: 49000 })).toBe(true);
    });

    it("returns false for number", () => {
      expect(hasHostBinding(8080)).toBe(false);
    });

    it("returns false for string", () => {
      expect(hasHostBinding("8080")).toBe(false);
      expect(hasHostBinding("8080/tcp")).toBe(false);
    });
  });

  describe("getProtocol", () => {
    it("returns tcp for number", () => {
      expect(getProtocol(8080)).toBe("tcp");
    });

    it("returns tcp for string without protocol", () => {
      expect(getProtocol("8080")).toBe("tcp");
    });

    it("returns protocol from string", () => {
      expect(getProtocol("8080/tcp")).toBe("tcp");
      expect(getProtocol("8080/udp")).toBe("udp");
    });

    it("returns protocol from object", () => {
      expect(getProtocol({ container: 8080, host: 49000 })).toBe("tcp");
      expect(getProtocol({ container: 8080, host: 49000, protocol: "udp" })).toBe("udp");
    });

    it("handles protocol case-insensitively", () => {
      expect(getProtocol({ container: 8080, host: 49000, protocol: "TCP" })).toBe("tcp");
      expect(getProtocol({ container: 8080, host: 49000, protocol: "UDP" })).toBe("udp");
      expect(getProtocol("8080/TCP")).toBe("tcp");
      expect(getProtocol("8080/UDP")).toBe("udp");
    });

    it("maintains backward compatibility", () => {
      expect(getProtocol(8080)).toBe("tcp");
      expect(getProtocol("8080")).toBe("tcp");
      expect(getProtocol({ container: 8080, host: 49000 })).toBe("tcp");
    });
  });
});
