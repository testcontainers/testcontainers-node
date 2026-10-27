import { NpipeSocketStrategy } from "./npipe-socket-strategy";

describe("NpipeSocketStrategy", () => {
  it("should not apply when platform is not win32", async () => {
    const result = await new NpipeSocketStrategy("linux").getResult();
    expect(result).toEqual({ notApplicable: "only used on Windows" });
  });

  it("should return expected result", async () => {
    const result = await new NpipeSocketStrategy("win32").getResult();
    assert(!("notApplicable" in result));

    expect(result.uri).toEqual("npipe:////./pipe/docker_engine");
    expect(result.dockerOptions).toEqual({ socketPath: "//./pipe/docker_engine" });
    expect(result.composeEnvironment).toEqual({});
    expect(result.allowUserOverrides).toEqual(true);
  });
});
