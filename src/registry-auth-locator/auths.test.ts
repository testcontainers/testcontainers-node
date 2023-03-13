import { DockerConfig } from "./types";
import { Auths } from "./auths";
import { AuthConfig } from "../docker/types";

describe("Auths", () => {
  const locator = new Auths();

  describe("getAuthConfig", () => {
    it("should return undefined when auths is undefined", async () => {
      const dockerConfig: DockerConfig = {};
      expect(await locator.getAuthConfig("registry-name", dockerConfig)).toBeUndefined();
    });

    it("should return undefined when auths does not contain registry name", async () => {
      const dockerConfig: DockerConfig = { auths: {} };
      expect(await locator.getAuthConfig("registry-name", dockerConfig)).toBeUndefined();
    });

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

    it("should not return credentials for registry which is a partial match", async () => {
      const dockerConfig: DockerConfig = {
        auths: {
          "https://registry.example.com": {
            email: "user@example.com",
            username: "user",
            password: "pass",
          },
        },
      };
      expect(await locator.getAuthConfig("registry.example.co", dockerConfig)).toBeUndefined();
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
