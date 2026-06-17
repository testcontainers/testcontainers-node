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
  });
});
