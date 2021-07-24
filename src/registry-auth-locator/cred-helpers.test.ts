import { DockerConfig } from "./types";
import { CredHelpers } from "./cred-helpers";
import { AuthConfig } from "../docker/types";

describe("CredHelpers", () => {
  const locator = new CredHelpers();

  describe("getAuthConfig", () => {
    it("should return undefined when config does not contain cred helpers", async () => {
      const dockerConfig: DockerConfig = {};
      expect(await locator.getAuthConfig("registry-name", dockerConfig)).toBe(undefined);
    });

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
