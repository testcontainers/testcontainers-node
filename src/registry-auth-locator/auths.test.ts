import { DockerConfig } from "./types";
import { AuthConfig } from "../docker-client";
import { Auths } from "./auths";

describe("Auths", () => {
  const locator = new Auths();

  describe("isApplicable", () => {
    it("should return false when auths is undefined", () => {
      const dockerConfig: DockerConfig = {};
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
    });

    it("should return false when auths does not contain registry name", () => {
      const dockerConfig: DockerConfig = { auths: {} };
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(false);
    });

    it("should return true when auths does contain registry name", () => {
      /*
      { 'https://index.docker.io/v1/':
         { auth:
            'Z2l0aHViYWN0aW9uczozZDY0NzJiOS0zZDQ5LTRkMTctOWZjOS05MGQyNDI1ODA0M2I=' } }
       */
      const dockerConfig: DockerConfig = { auths: { "registry-name": { auth: "value" } } };
      expect(locator.isApplicable("registry-name", dockerConfig)).toBe(true);
    });
  });

  describe("getAuthConfig", () => {
    it("should return credentials from username and password", async () => {
      const dockerConfig: DockerConfig = {
        auths: {
          "https://registry.example.com": {
            email: "user@example.com",
            username: "user",
            password: "pass",
          },
        },
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
        auths: {
          "https://registry.example.com": {
            email: "user@example.com",
            auth: "dXNlcjpwYXNz",
          },
        },
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
