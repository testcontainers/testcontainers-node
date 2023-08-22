import { NpipeSocketStrategy } from "./npipe-socket-strategy";

describe("NpipeSocketStrategy", () => {
  it("should return undefined when platform is not win32", async () => {
    const result = await new NpipeSocketStrategy("linux").getResult();
    expect(result).toBeUndefined();
  });

  it("should return expected result", async () => {
    const result = await new NpipeSocketStrategy("win32").getResult();

    expect(result?.uri).toEqual("npipe:////./pipe/docker_engine");
    expect(result?.dockerOptions).toEqual({ socketPath: "//./pipe/docker_engine" });
    expect(result?.composeEnvironment).toEqual({});
    expect(result?.allowUserOverrides).toEqual(true);
  });
});
