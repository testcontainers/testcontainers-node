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
    // Logs from long-lived containers such as the reaper can arrive after a file's tests finish:
    // https://github.com/vitest-dev/vitest/issues/11153
    onUnhandledError(error) {
      return !(error.name === "EnvironmentTeardownError" && error.message.includes('"onUserConsoleLog"'));
    },
    sequence: {
      concurrent: true,
    },
    alias: {
      testcontainers: path.resolve(import.meta.dirname, "packages/testcontainers/src"),
    },
    coverage: {
      include: ["packages/**/*.ts"],
      exclude: ["**/*.test.ts"],
    },
  },
});
