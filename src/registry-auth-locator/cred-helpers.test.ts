import { DockerConfig } from "./types";
import { AuthConfig } from "../docker-client";
import { CredHelpers } from "./cred-helpers";

describe("CredHelpers", () => {
  const locator = new CredHelpers();

  describe("isApplicable", () => {
    it("should return false when config does not contain cred helpers", () => {
      const dockerConfig: DockerConfig = {};
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
    });

    it("should return true when config contains cred helpers", () => {
      const dockerConfig: DockerConfig = { credHelpers: { "registry-name": "helperName" } };
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(true);
    });
  });

  describe("getAuthConfig", () => {
    xit("should work", async () => {
      const dockerConfig: DockerConfig = { credHelpers: { "index.docker.io": "desktop" } };
      const authConfig: AuthConfig = {
        username: expect.stringMatching(/.+/),
        password: expect.stringMatching(/.+/),
        registryAddress: "index.docker.io",
      };
      expect(await locator.getAuthConfig("index.docker.io", dockerConfig)).toEqual(authConfig);
    });
  });
});
