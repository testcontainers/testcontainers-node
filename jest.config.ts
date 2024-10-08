import type { Config } from "jest";

const config: Config = {
  projects: ["<rootDir>/packages/testcontainers/jest.config.ts", "<rootDir>/packages/modules/*/jest.config.ts"],
  reporters: [["github-actions", { silent: false }], "summary"],
};

export default config;
