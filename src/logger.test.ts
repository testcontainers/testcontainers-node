import { createContainerLogger } from "./logger";
import { Debugger } from "debug";

describe("Logger", () => {
  it("createContainerLogger creating DebugLogger with container namespace", () => {
    const name = "my-api";
    const logger = createContainerLogger(name);

    expect((logger["logger"] as Debugger).namespace).toBe(`testcontainers:container:${name}`);
  });
});
