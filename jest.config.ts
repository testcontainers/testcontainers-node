import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    "^@testcontainers/(.*)$": "<rootDir>/src/$1/src",
  },
};

export default config;
