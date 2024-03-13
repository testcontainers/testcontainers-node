import type { Config } from "jest";
import * as path from "path";

const config: Config = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^testcontainers$": path.resolve(__dirname, "../../testcontainers/src"),
  },
  modulePathIgnorePatterns: ["<rootDir>/src/example-project/", "<rootDir>/build/"],
};

export default config;
