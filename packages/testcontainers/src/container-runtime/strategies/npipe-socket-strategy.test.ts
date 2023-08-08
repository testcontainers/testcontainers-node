import { NpipeSocketStrategy } from "./npipe-socket-strategy";

describe("NpipeSocketStrategy", () => {
  it("should return undefined when platform is not win32", async () => {
    const process = { platform: "linux" };
    const result = await new NpipeSocketStrategy(process).getResult();
    expect(result).toBeUndefined();
  });

  it("should return expected result", async () => {
    const process = { platform: "win32" };

    const result = await new NpipeSocketStrategy(process).getResult();

    expect(result?.uri).toEqual("npipe:////./pipe/docker_engine");
    expect(result?.dockerOptions).toEqual({ socketPath: "//./pipe/docker_engine" });
    expect(result?.composeEnvironment).toEqual({});
    expect(result?.allowUserOverrides).toEqual(true);
  });
});
