import type { Environment, EnvironmentInput } from "../types";

export function toEnvironment(environment: EnvironmentInput): Environment {
  return Object.fromEntries(
    Object.entries(environment).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]]))
  );
}
