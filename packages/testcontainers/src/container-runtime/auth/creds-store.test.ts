import { CredsStore } from "./creds-store";
import { AuthConfig, ContainerRuntimeConfig } from "./types";

describe("CredsStore", () => {
  const locator = new CredsStore();

  describe("getAuthConfig", () => {
    it("should return undefined when config does not contain creds store", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {};
      expect(await locator.getAuthConfig("registry-name", containerRuntimeConfig)).toBe(undefined);
    });

    it("should return undefined when when creds store is empty", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = { credsStore: "" };
      expect(await locator.getAuthConfig("registry-name", containerRuntimeConfig)).toBe(undefined);
    });

    it.skip("should work", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = { credsStore: "desktop" };
      const authConfig: AuthConfig = {
        username: expect.stringMatching(/.+/),
        password: expect.stringMatching(/.+/),
        registryAddress: "index.docker.io",
      };
      expect(await locator.getAuthConfig("index.docker.io", containerRuntimeConfig)).toEqual(authConfig);
    });
  });
});
