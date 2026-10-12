import * as path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: {
      DEBUG: "testcontainers*",
    },
    passWithNoTests: true,
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
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
