import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CredHelpers } from "./cred-helpers";
import type { AuthConfig, ContainerRuntimeConfig } from "./types";

describe("CredHelpers", () => {
  const locator = new CredHelpers();

  describe("getAuthConfig", () => {
    it("should return undefined when config does not contain cred helpers", async () => {
      const containerRuntimeConfig: ContainerRuntimeConfig = {};
      expect(await locator.getAuthConfig("registry-name", containerRuntimeConfig)).toBe(undefined);
    });

    it("should run a cred helper that is a script", { concurrent: false }, async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), "testcontainers-"));
      const output = JSON.stringify({ ServerURL: "registry.example.com", Username: "username", Secret: "secret" });
      if (process.platform === "win32") {
        await fs.writeFile(
          path.join(directory, "docker-credential-tc-script.cmd"),
          `@echo off\r\nset /p registry=\r\necho ${output}\r\n`
        );
      } else {
        await fs.writeFile(
          path.join(directory, "docker-credential-tc-script"),
          `#!/bin/sh\nread registry\necho '${output}'\n`,
          { mode: 0o755 }
        );
      }
      vi.stubEnv("PATH", `${directory}${path.delimiter}${process.env.PATH}`);

      try {
        const containerRuntimeConfig: ContainerRuntimeConfig = { credHelpers: { "registry.example.com": "tc-script" } };
        expect(await locator.getAuthConfig("registry.example.com", containerRuntimeConfig)).toEqual({
          username: "username",
          password: "secret",
          registryAddress: "registry.example.com",
        });
      } finally {
        await fs.rm(directory, { recursive: true, force: true });
      }
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
