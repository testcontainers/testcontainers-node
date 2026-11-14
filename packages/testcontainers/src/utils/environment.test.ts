import { describe, expect, it } from "vitest";
import { toEnvironment } from "./environment";

describe("toEnvironment", () => {
  it("should convert numbers and booleans to strings", () => {
    expect(toEnvironment({ port: 8080, debug: true, verbose: false, name: "value" })).toEqual({
      port: "8080",
      debug: "true",
      verbose: "false",
      name: "value",
    });
  });

  it("should skip keys whose value is undefined", () => {
    expect(toEnvironment({ defined: "value", optional: undefined })).toEqual({ defined: "value" });
  });

  it("should keep empty strings", () => {
    expect(toEnvironment({ empty: "" })).toEqual({ empty: "" });
  });
});
