import { hash } from "./hash.js";

test("should return a hash", () => {
  const str = "Hello, world!";

  expect(hash(str)).toBe("6cd3556deb0da54bca060b4c39479839");
  expect(hash(str)).toBe("6cd3556deb0da54bca060b4c39479839");
});
