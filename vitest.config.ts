import * as path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: {
      DEBUG: "testcontainers*",
    },
    passWithNoTests: true,
    silent: "passed-only",
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    retry: process.env.CI ? 3 : 0,
    exclude: [
      ...configDefaults.exclude,
      "packages/testcontainers/smoke-test.jest.test.js",
    ],
    sequence: {
      concurrent: true,
    },
    alias: {
      testcontainers: path.resolve(__dirname, "packages/testcontainers/src"),
    },
    coverage: {
      include: ["packages/**/*.ts"],
      exclude: ["**/*.test.ts"],
    },
  },
});
