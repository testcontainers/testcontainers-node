import { Auths, CredHelpers, CredsStore, DockerConfig } from "./registry-auth-locator";

describe("RegistryAuthLocator", () => {
  describe("CredHelpers", () => {
    const locator = new CredHelpers();

    it("should return false when config does not contain cred helpers", () => {
      const dockerConfig: DockerConfig = {};
      expect(locator.applies("registry-name", dockerConfig)).toBe(false);
    });

    it("should return true when config contains cred helpers", () => {
      const dockerConfig: DockerConfig = { credHelpers: { "registry-name": "value" } };
      expect(locator.applies("registry-name", dockerConfig)).toBe(true);
    });
  });

  describe("CredsStore", () => {
    const locator = new CredsStore();

    it("should return false when config does not contain creds store", () => {
      const dockerConfig: DockerConfig = {};
      expect(locator.applies("registry-name", dockerConfig)).toBe(false);
    });

    it("should return false when creds store is empty", () => {
      const dockerConfig: DockerConfig = { credsStore: "" };
      expect(locator.applies("registry-name", dockerConfig)).toBe(false);
    });

    it("should return true when config does contain cred store", () => {
      const dockerConfig: DockerConfig = { credsStore: "storeName" };
      expect(locator.applies("registry-name", dockerConfig)).toBe(true);
    });
  });

  describe("Auths", () => {
    const locator = new Auths();

    it("should return false when auths is undefined", () => {
      const dockerConfig: DockerConfig = {};
      expect(locator.applies("registry-name", dockerConfig)).toBe(false);
    });

    it("should return false when auths does not contain registry name", () => {
      const dockerConfig: DockerConfig = { auths: [] };
      expect(locator.applies("registry-name", dockerConfig)).toBe(false);
    });

    it("should return true when auths does contain registry name", () => {
      const dockerConfig: DockerConfig = { auths: [{ "registry-name": { auth: "value" } }] };
      expect(locator.applies("registry-name", dockerConfig)).toBe(true);
    });
  });
});
