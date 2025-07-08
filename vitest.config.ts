import * as path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: {
      DEBUG: "testcontainers*",
    },
    silent: "passed-only",
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    retry: process.env.CI ? 3 : 0,
    alias: {
      testcontainers: path.resolve(__dirname, "packages/testcontainers/src"),
    },
  },
});
