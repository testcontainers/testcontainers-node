import { Auths } from "./auths";
import { AuthConfig, ContainerRuntimeConfig } from "./types";

describe("Auths", () => {
  const locator = new Auths();

  describe("getAuthConfig", () => {
    it("should return undefined when auths is undefined", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {};
      expect(await locator.getAuthConfig("registry-name", containerRuntimeConfig)).toBeUndefined();
    });

    it("should return undefined when auths does not contain registry name", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = { auths: {} };
      expect(await locator.getAuthConfig("registry-name", containerRuntimeConfig)).toBeUndefined();
    });

    it("should return credentials from username and password", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {
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
      expect(await locator.getAuthConfig("https://registry.example.com", containerRuntimeConfig)).toEqual(authConfig);
    });

    it("should not return credentials for registry which is a partial match", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {
        auths: {
          "https://registry.example.com": {
            email: "user@example.com",
            username: "user",
            password: "pass",
          },
        },
      };
      expect(await locator.getAuthConfig("registry.example.co", containerRuntimeConfig)).toBeUndefined();
    });

    it("should return credentials from encoded auth", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {
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
      expect(await locator.getAuthConfig("https://registry.example.com", containerRuntimeConfig)).toEqual(authConfig);
    });

    it("should return credentials from encoded auth when the password contains a colon", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {
        auths: {
          "https://registry.example.com": {
            email: "user@example.com",
            auth: "dXNlcjpwYXNzOjE=",
          },
        },
      };
      const authConfig: AuthConfig = {
        username: "user",
        password: "pass:1",
        email: "user@example.com",
        registryAddress: "https://registry.example.com",
      };
      expect(await locator.getAuthConfig("https://registry.example.com", containerRuntimeConfig)).toEqual(authConfig);
    });
  });
});
