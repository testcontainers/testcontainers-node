import { DockerConfig } from "./types";
import { AuthConfig } from "../docker-client";
import { CredsStore } from "./creds-store";

describe("CredsStore", () => {
  const locator = new CredsStore();

  describe("isApplicable", () => {
    it("should return false when config does not contain creds store", () => {
      const dockerConfig: DockerConfig = {};
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
    });

    it("should return false when creds store is empty", () => {
      const dockerConfig: DockerConfig = { credsStore: "" };
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
    });

    it("should return true when config does contain cred store", () => {
      const dockerConfig: DockerConfig = { credsStore: "storeName" };
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(true);
    });
  });

  describe("getAuthConfig", () => {
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
