import { existsSync } from "fs";
import os from "os";
import path from "path";
import { RootlessUnixSocketStrategy } from "./rootless-unix-socket-strategy";

vi.mock("fs", () => ({ existsSync: vi.fn() }));

describe("RootlessUnixSocketStrategy", () => {
  const mockExistsSync = vi.mocked(existsSync);

  it("should return undefined for non-linux and non-darwin platforms", async () => {
    mockExistsSync.mockReturnValue(true);

    const strategy = new RootlessUnixSocketStrategy("win32", {});
    const result = await strategy.getResult();

    expect(result).toBeUndefined();
  });

  it("should return undefined when socket does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const strategy = new RootlessUnixSocketStrategy("linux", {});
    const result = await strategy.getResult();

    expect(result).toBeUndefined();
  });

  it("should return client for socket from XDG_RUNTIME_DIR", async () => {
    const socketPath = path.join("/tmp", "docker.sock");
    mockExistsSync.mockImplementation((file) => file === socketPath);

    const strategy = new RootlessUnixSocketStrategy("linux", { XDG_RUNTIME_DIR: "/tmp" });
    const result = await strategy.getResult();

    expect(result?.uri).toEqual(`unix://${socketPath}`);
  });

  it("should return client for socket from home run dir", async () => {
    const socketPath = path.join(os.homedir(), ".docker", "run", "docker.sock");
    mockExistsSync.mockImplementation((file) => file === socketPath);

    const strategy = new RootlessUnixSocketStrategy("linux", {});
    const result = await strategy.getResult();

    expect(result?.uri).toEqual(`unix://${socketPath}`);
  });

  it("should return Docker client for socket from home desktop dir", async () => {
    const socketPath = path.join(os.homedir(), ".docker", "desktop", "docker.sock");
    mockExistsSync.mockImplementation((file) => file === socketPath);

    const strategy = new RootlessUnixSocketStrategy("linux", {});
    const result = await strategy.getResult();

    expect(result?.uri).toEqual(`unix://${socketPath}`);
  });

  it("should return Docker client for socket from run dir", async () => {
    const socketPath = path.join("/run", "user", `${os.userInfo().uid}`, "docker.sock");
    mockExistsSync.mockImplementation((file) => file === socketPath);

    const strategy = new RootlessUnixSocketStrategy("linux", {});
    const result = await strategy.getResult();

    expect(result?.uri).toEqual(`unix://${socketPath}`);
  });
});
