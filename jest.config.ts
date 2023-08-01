import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    "^testcontainers$": "<rootDir>/src/testcontainers/src",
  },
};

export default config;
