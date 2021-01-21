import { Auths, CredHelpers, CredsStore, DockerConfig } from "./registry-auth-locator";
import { AuthConfig } from "./docker-client";

describe("RegistryAuthLocator", () => {
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
      it("should work", async () => {
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
      it("should work", async () => {
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

  describe("Auths", () => {
    const locator = new Auths();

    describe("isApplicable", () => {
      it("should return false when auths is undefined", () => {
        const dockerConfig: DockerConfig = {};
        expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
      });

      it("should return false when auths does not contain registry name", () => {
        const dockerConfig: DockerConfig = { auths: [] };
        expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
      });

      it("should return true when auths does contain registry name", () => {
        const dockerConfig: DockerConfig = { auths: [{ "registry-name": { auth: "value" } }] };
        expect(locator.isApplicable("registry-name", dockerConfig)).toBe(true);
      });
    });

    describe("getAuthConfig", () => {
      it("should return credentials from username and password", async () => {
        const dockerConfig: DockerConfig = {
          auths: [
            {
              "https://registry.example.com": {
                email: "user@example.com",
                username: "user",
                password: "pass",
              },
            },
          ],
        };
        const authConfig: AuthConfig = {
          username: "user",
          password: "pass",
          email: "user@example.com",
          registryAddress: "https://registry.example.com",
        };
        expect(await locator.getAuthConfig("https://registry.example.com", dockerConfig)).toEqual(authConfig);
      });

      it("should return credentials from encoded auth", async () => {
        const dockerConfig: DockerConfig = {
          auths: [
            {
              "https://registry.example.com": {
                email: "user@example.com",
                auth: "dXNlcjpwYXNz",
              },
            },
          ],
        };
        const authConfig: AuthConfig = {
          username: "user",
          password: "pass",
          email: "user@example.com",
          registryAddress: "https://registry.example.com",
        };
        expect(await locator.getAuthConfig("https://registry.example.com", dockerConfig)).toEqual(authConfig);
      });
    });
  });
});
