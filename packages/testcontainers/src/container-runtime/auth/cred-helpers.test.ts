import { CredHelpers } from "./cred-helpers";
import { AuthConfig, ContainerRuntimeConfig } from "./types";

describe("CredHelpers", () => {
  const locator = new CredHelpers();

  describe("getAuthConfig", () => {
    it("should return undefined when config does not contain cred helpers", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {};
      expect(await locator.getAuthConfig("registry-name", containerRuntimeConfig)).toBe(undefined);
    });

    it.skip("should work", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = { credHelpers: { "index.docker.io": "desktop" } };
      const authConfig: AuthConfig = {
        username: expect.stringMatching(/.+/),
        password: expect.stringMatching(/.+/),
        registryAddress: "index.docker.io",
      };
      expect(await locator.getAuthConfig("index.docker.io", containerRuntimeConfig)).toEqual(authConfig);
    });
  });
});
