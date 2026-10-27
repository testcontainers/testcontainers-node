import { describe, expect, it } from "vitest";
import { createNoWorkingStrategyError } from "./no-working-strategy-error";

describe("createNoWorkingStrategyError", () => {
  it("should list each strategy and why it was skipped", () => {
    const error = createNoWorkingStrategyError([
      { name: "ConfigurationStrategy", reason: "not applicable: DOCKER_HOST is not set" },
      { name: "UnixSocketStrategy", reason: "not applicable: /var/run/docker.sock does not exist" },
    ]);

    expect(error.message).toBe(
      [
        "Could not find a working container runtime strategy. Tried:",
        "  - ConfigurationStrategy: not applicable: DOCKER_HOST is not set",
        "  - UnixSocketStrategy: not applicable: /var/run/docker.sock does not exist",
        "See https://node.testcontainers.org/supported-container-runtimes/",
      ].join("\n")
    );
    expect(error.cause).toBeUndefined();
  });

  it("should attach the errors of strategies that failed as the cause", () => {
    const permissionDenied = new Error("connect EACCES /var/run/docker.sock");

    const error = createNoWorkingStrategyError([
      { name: "NpipeSocketStrategy", reason: "not applicable: only used on Windows" },
      { name: "UnixSocketStrategy", reason: `failed: ${permissionDenied.message}`, error: permissionDenied },
    ]);

    expect(error.message).toContain("  - UnixSocketStrategy: failed: connect EACCES /var/run/docker.sock");
    expect(error.cause).toBeInstanceOf(AggregateError);
    expect((error.cause as AggregateError).errors).toEqual([permissionDenied]);
  });
});
