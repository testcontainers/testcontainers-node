import { describe, expect } from "vitest";
import { getContainerPort, getProtocol, hasHostBinding } from "./port";

describe("port utilities", () => {
  describe("getContainerPort", () => {
    it("should return the container port when defined as a number", () => {
      expect(getContainerPort(8080)).toBe(8080);
    });

    it("should return the port when defined as a string with format `port/protocol`", () => {
      expect(getContainerPort("8080/tcp")).toBe(8080);
      expect(getContainerPort("8080/udp")).toBe(8080);
    });

    it("should return the container port from when defined as `PortWithBinding`", () => {
      expect(getContainerPort({ container: 8080, host: 49000 })).toBe(8080);
    });
  });

  describe("hasHostBinding", () => {
    it("should return true for `PortWithBinding` with defined `host` parameter", () => {
      expect(hasHostBinding({ container: 8080, host: 49000 })).toBe(true);
    });

    it("should return false when querying for a number", () => {
      expect(hasHostBinding(8080)).toBe(false);
    });

    it("should return false when querying for a string with format `port/protocol`", () => {
      expect(hasHostBinding("8080/tcp")).toBe(false);
    });
  });

  describe("getProtocol", () => {
    it("should return the default `tcp` for a number", () => {
      expect(getProtocol(8080)).toBe("tcp");
    });

    it("should return the protocol part of a string with format `port/protocol`", () => {
      expect(getProtocol("8080/tcp")).toBe("tcp");
      expect(getProtocol("8080/udp")).toBe("udp");
    });

    it("should maintain backwards compatibility when defined as `PortWithBinding` without protocol", () => {
      expect(getProtocol({ container: 8080, host: 49000 })).toBe("tcp");
    });

    it("should return the protocol parameter when defined as `PortWithBinding`", () => {
      expect(getProtocol({ container: 8080, host: 49000, protocol: "udp" })).toBe("udp");
    });
  });
});
