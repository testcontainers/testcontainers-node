import type { Config } from "jest";

const config: Config = {
  projects: ["<rootDir>/src/testcontainers/jest.config.ts", "<rootDir>/src/modules/*/jest.config.ts"],
};

export default config;
