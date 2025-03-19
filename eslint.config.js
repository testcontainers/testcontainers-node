import eslint from "@eslint/js";
import json from "@eslint/json";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

/** @type {import("typescript-eslint").ConfigArray} */
export default [
  {
    ignores: ["**/build/"],
  },
  {
    ignores: ["package-lock.json"],
    files: ["**/*.json"],
    language: "json/json",
    ...json.configs.recommended,
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  eslintPluginPrettier,
  {
    rules: {
      "prettier/prettier": [
        "error",
        {
          trailingComma: "es5",
        },
      ],
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          caughtErrors: "none",
        },
      ],
      "no-irregular-whitespace": "off",
    },
  },
];
