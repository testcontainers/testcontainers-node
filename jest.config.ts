import type { Config } from "jest";

const config: Config = {
  projects: ["<rootDir>/packages/testcontainers/jest.config.ts", "<rootDir>/packages/modules/*/jest.config.ts"],
};

export default config;
