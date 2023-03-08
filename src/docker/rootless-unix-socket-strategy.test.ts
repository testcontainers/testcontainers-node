import { existsSync } from "fs";
import { RootlessUnixSocketStrategy } from "./rootless-unix-socket-strategy";
import os from "os";
import path from "path";

jest.mock("fs", () => ({ existsSync: jest.fn() }));

describe("RootlessUnixSocketStrategy", () => {
  const mockExistsSync = jest.mocked(existsSync);

  it("should return not applicable for non-linux and non-darwin platforms", async () => {
    mockExistsSync.mockReturnValue(true);

    const strategy = new RootlessUnixSocketStrategy("win32", {});
    await strategy.init();

    expect(strategy.isApplicable()).toBe(false);
  });

  it("should return not applicable when socket does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const strategy = new RootlessUnixSocketStrategy("linux", {});
    await strategy.init();

    expect(strategy.isApplicable()).toBe(false);
  });

  it("should return Docker client for socket from XDG_RUNTIME_DIR", async () => {
    mockExistsSync.mockImplementationOnce((file) => file === path.join("/tmp", "docker.sock"));

    const strategy = new RootlessUnixSocketStrategy("linux", { XDG_RUNTIME_DIR: "/tmp" });
    await strategy.init();

    expect(strategy.isApplicable()).toBe(true);
    expect((await strategy.getDockerClient()).uri).toEqual(`unix://${path.join("/tmp", "docker.sock")}`);
  });

  it("should return Docker client for socket from home dir", async () => {
    mockExistsSync.mockImplementationOnce((file) => file === path.join(os.homedir(), ".docker", "run", "docker.sock"));

    const strategy = new RootlessUnixSocketStrategy("linux", {});
    await strategy.init();

    expect(strategy.isApplicable()).toBe(true);
    expect((await strategy.getDockerClient()).uri).toEqual(
      `unix://${path.join(os.homedir(), ".docker", "run", "docker.sock")}`
    );
  });
});
