import { existsSync } from "node:fs";
import { UnixSocketStrategy } from "./unix-socket-strategy";

vi.mock("node:fs");
const mockExistsSync = vi.mocked(existsSync);

describe("UnixSocketStrategy", { concurrent: false }, () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
  });

  it("should not apply when platform is not linux or darwin", async () => {
    const result = await new UnixSocketStrategy("win32").getResult();
    expect(result).toEqual({ notApplicable: "only used on Linux and macOS" });
  });

  it("should not apply when platform is correct but socket does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await new UnixSocketStrategy("linux").getResult();

    expect(result).toEqual({ notApplicable: "/var/run/docker.sock does not exist" });
  });

  it("should return expected result", async () => {
    const result = await new UnixSocketStrategy("linux").getResult();
    assert(!("notApplicable" in result));

    expect(result.uri).toEqual("unix:///var/run/docker.sock");
    expect(result.dockerOptions).toEqual({ socketPath: "/var/run/docker.sock" });
    expect(result.composeEnvironment).toEqual({});
    expect(result.allowUserOverrides).toEqual(true);
  });
});
