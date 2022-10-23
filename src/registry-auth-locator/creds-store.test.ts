import { DockerConfig } from "./types.js";
import { CredsStore } from "./creds-store.js";
import { AuthConfig } from "../docker/types.js";

describe("CredsStore", () => {
  const locator = new CredsStore();

  describe("getAuthConfig", () => {
    it("should return undefined when config does not contain creds store", async () => {
      const dockerConfig: DockerConfig = {};
      expect(await locator.getAuthConfig("registry-name", dockerConfig)).toBe(undefined);
    });

    it("should return undefined when when creds store is empty", async () => {
      const dockerConfig: DockerConfig = { credsStore: "" };
      expect(await locator.getAuthConfig("registry-name", dockerConfig)).toBe(undefined);
    });

    xit("should work", async () => {
      const dockerConfig: DockerConfig = { credsStore: "desktop" };
      const authConfig: AuthConfig = {
        username: expect.stringMatching(/.+/),
        password: expect.stringMatching(/.+/),
        registryAddress: "index.docker.io",
      };
      expect(await locator.getAuthConfig("index.docker.io", dockerConfig)).toEqual(authConfig);
    });
  });
});
