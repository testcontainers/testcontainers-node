import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    mockReset: true,
    restoreMocks: true,
    alias: {
      testcontainers: path.resolve(__dirname, "packages/testcontainers/src"),
    },
  },
});
