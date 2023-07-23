describe("get auth config", () => {
  let mockExistsSync: jest.Mock;
  let mockReadFile: jest.Mock;

  beforeEach(async () => {
    jest.mock("fs");
    const { existsSync } = await import("fs");
    mockExistsSync = existsSync as jest.Mock;
    jest.mock("fs/promises");
    const { readFile } = await import("fs/promises");
    mockReadFile = readFile as jest.Mock;
  });

  afterEach(() => {
    delete process.env.DOCKER_AUTH_CONFIG;
    jest.resetModules();
  });

  it("should use DOCKER_AUTH_CONFIG environment variable as Docker config", async () => {
    process.env.DOCKER_AUTH_CONFIG = JSON.stringify({
      auths: {
        "https://registry.example.com": {
          email: "user@example.com",
          username: "user",
          password: "pass",
        },
      },
    });
    const { getAuthConfig } = await import("./get-auth-config");
    expect(await getAuthConfig("https://registry.example.com")).toEqual({
      username: "user",
      password: "pass",
      email: "user@example.com",
      registryAddress: "https://registry.example.com",
    });
  });

  it("should return auth from docker config file", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          auths: {
            "https://registry.example.com": {
              email: "user@example.com",
              username: "user",
              password: "pass",
            },
          },
        })
      )
    );
    const { getAuthConfig } = await import("./get-auth-config");
    expect(await getAuthConfig("https://registry.example.com")).toEqual({
      username: "user",
      password: "pass",
      email: "user@example.com",
      registryAddress: "https://registry.example.com",
    });
  });

  it("should return empty auth when docker config file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const { getAuthConfig } = await import("./get-auth-config");
    expect(await getAuthConfig("https://registry.example.com")).toBeUndefined();
  });
});
