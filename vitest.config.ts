import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    silent: "passed-only",
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    alias: {
      testcontainers: path.resolve(__dirname, "packages/testcontainers/src"),
    },
  },
});
