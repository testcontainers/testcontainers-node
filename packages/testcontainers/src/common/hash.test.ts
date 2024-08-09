import { hash } from "./hash";

test("should return a consistent hash", () => {
  const str = "Hello, world!";

  expect(hash(str)).toBe("315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3");
  expect(hash(str)).toBe("315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3");
});
