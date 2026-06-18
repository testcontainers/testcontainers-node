import { FixedPortGenerator, getRandomPort } from "./port-generator";

describe("PortGenerator", () => {
  describe("FixedPortGenerator", () => {
    it("should return pre-determined ports", async () => {
      const fixedPortGenerator = new FixedPortGenerator([1000, 1001]);

      await expect(fixedPortGenerator.generatePort()).resolves.toBe(1000);
      await expect(fixedPortGenerator.generatePort()).resolves.toBe(1001);
    });
  });

  describe("getRandomPort", () => {
    it("should generate a random available port", async () => {
      const port1 = await getRandomPort();
      const port2 = await getRandomPort();

      expect(port1).toBeDefined();
      expect(port2).toBeDefined();
      expect(port1).not.toBe(port2);
    });

    it("should not return a recently generated port again", async () => {
      vi.resetModules();
      const offeredPorts = [1000, 1000, 1001];
      const createServer = vi.fn(() => createServerOfferingPort(offeredPorts.shift()!));
      vi.doMock("net", () => ({
        default: { createServer },
      }));

      const { getRandomPort } = await import("./port-generator.js");

      await expect(getRandomPort()).resolves.toBe(1000);
      await expect(getRandomPort()).resolves.toBe(1001);
      expect(createServer).toHaveBeenCalledTimes(3);

      vi.doUnmock("net");
      vi.resetModules();
    });
  });
});

const createServerOfferingPort = (port: number) => {
  const server = {
    address: vi.fn(() => ({ port })),
    close: vi.fn((callback: (err?: Error) => void) => callback()),
    listen: vi.fn((_port: number, callback: () => void) => {
      callback();
      return server;
    }),
    once: vi.fn(),
    unref: vi.fn(),
  };

  return server;
};
