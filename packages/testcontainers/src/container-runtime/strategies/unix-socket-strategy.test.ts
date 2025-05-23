import { existsSync } from "fs";
import { UnixSocketStrategy } from "./unix-socket-strategy";

vi.mock("fs");
const mockExistsSync = vi.mocked(existsSync);

describe("UnixSocketStrategy", () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
  });

  it("should return undefined when platform is not linux or darwin", async () => {
    const result = await new UnixSocketStrategy("win32").getResult();
    expect(result).toBeUndefined();
  });

  it("should return undefined when platform is correct but socket does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await new UnixSocketStrategy("linux").getResult();

    expect(result).toBeUndefined();
  });

  it("should return expected result", async () => {
    const result = await new UnixSocketStrategy("linux").getResult();

    expect(result?.uri).toEqual("unix:///var/run/docker.sock");
    expect(result?.dockerOptions).toEqual({ socketPath: "/var/run/docker.sock" });
    expect(result?.composeEnvironment).toEqual({});
    expect(result?.allowUserOverrides).toEqual(true);
  });
});
