import { registryMatches } from "./registry-matches";

describe("registryMatches", () => {
  it("should return true when registries are equal", () => {
    expect(registryMatches("https://registry.example.com", "https://registry.example.com")).toBe(true);
  });

  it("should return true when registries are equal without protocol", () => {
    expect(registryMatches("https://registry.example.com", "registry.example.com")).toBe(true);
  });

  it("should return false when registries do not match", () => {
    expect(registryMatches("https://registry.example.com", "registry.example.co")).toBe(false);
  });
});
