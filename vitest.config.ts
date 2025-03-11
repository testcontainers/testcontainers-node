import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: true,
    globals: true,
    mockReset: true,
    restoreMocks: true,
    alias: {
      testcontainers: path.resolve(__dirname, "packages/testcontainers/src"),
    },
    // workspace: [
    //   "packages/testcontainers",
    //   {
    //     extends: true,
    //   },
    //   "packages/modules/*",
    //   {
    //     extends: true,
    //     resolve: {
    //       alias: {
    //         testcontainers: path.resolve(__dirname, "packages/testcontainers/src"),
    //       },
    //     },
    //   },
    // ],
  },
});
