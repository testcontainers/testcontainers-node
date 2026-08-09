import * as path from "path";
import { configDefaults, defineConfig } from "vitest/config";
const bunTestExclusions = process.env.CI_BUN
  ? [
      // https://github.com/oven-sh/bun/issues/19337
      "packages/modules/kafka/**/*.test.ts",
      "packages/modules/redpanda/**/*.test.ts",
      // https://github.com/oven-sh/bun/issues/12730
      "packages/modules/couchbase/**/*.test.ts",
      // https://github.com/oven-sh/bun/issues/32501
      "packages/modules/mongodb/**/*.test.ts",
    ]
  : [];

export default defineConfig({
  test: {
    globals: true,
    env: {
      DEBUG: "testcontainers*",
    },
    passWithNoTests: true,
    exclude: [...configDefaults.exclude, ...bunTestExclusions],
    silent: "passed-only",
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    retry: process.env.CI ? 3 : 0,
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
