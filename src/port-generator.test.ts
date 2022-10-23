import { FixedPortGenerator, RandomUniquePortGenerator } from "./port-generator.js";

describe("PortGenerator", () => {
  describe("RandomUniquePortGenerator", () => {
    it("should generate a random and unique port across all instances", async () => {
      const fixedPortGenerator = new FixedPortGenerator([1000, 1000, 1001]);
      expect(await new RandomUniquePortGenerator(fixedPortGenerator).generatePort()).toBe(1000);
      expect(await new RandomUniquePortGenerator(fixedPortGenerator).generatePort()).toBe(1001);
    });
  });
});
