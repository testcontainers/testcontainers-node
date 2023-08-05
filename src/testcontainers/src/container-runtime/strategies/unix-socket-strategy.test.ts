import { existsSync } from "fs";
import { UnixSocketStrategy } from "./unix-socket-strategy";

jest.mock("fs");
const mockExistsSync = jest.mocked(existsSync);

describe("UnixSocketStrategy", () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
  });

  it("should return undefined when platform is not linux or darwin", async () => {
    const process = { platform: "win32" };
    const result = await new UnixSocketStrategy(process).getResult();
    expect(result).toBeUndefined();
  });

  it("should return undefined when platform is correct but socket does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const process = { platform: "linux" };

    const result = await new UnixSocketStrategy(process).getResult();

    expect(result).toBeUndefined();
  });

  it("should return expected result", async () => {
    const process = { platform: "linux" };

    const result = await new UnixSocketStrategy(process).getResult();

    expect(result?.uri).toEqual("unix:///var/run/docker.sock");
    expect(result?.dockerOptions).toEqual({ socketPath: "/var/run/docker.sock" });
    expect(result?.composeEnvironment).toEqual({});
    expect(result?.allowUserOverrides).toEqual(true);
  });
});
