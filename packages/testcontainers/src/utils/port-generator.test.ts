import { FixedPortGenerator, RandomPortGenerator } from "./port-generator";

describe("PortGenerator", () => {
  describe("FixedPortGenerator", () => {
    it("should return pre-determined ports", async () => {
      const fixedPortGenerator = new FixedPortGenerator([1000, 1001]);

      await expect(fixedPortGenerator.generatePort()).resolves.toBe(1000);
      await expect(fixedPortGenerator.generatePort()).resolves.toBe(1001);
    });

    it("should throw when no more ports are available", async () => {
      const fixedPortGenerator = new FixedPortGenerator([1000]);

      await expect(fixedPortGenerator.generatePort()).resolves.toBe(1000);
      expect(() => fixedPortGenerator.generatePort()).toThrowError("FixedPortGenerator has no more ports available");
    });
  });

  describe("RandomPortGenerator", () => {
    it("should generate a random available port", async () => {
      const randomPortGenerator = new RandomPortGenerator();

      const port1 = await randomPortGenerator.generatePort();
      const port2 = await randomPortGenerator.generatePort();

      expect(port1).toBeDefined();
      expect(port2).toBeDefined();
      expect(port1).not.toBe(port2);
    });
  });
});
