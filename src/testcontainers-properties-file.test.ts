describe("testcontainers properties file", () => {
  let mockedExistsSync: jest.Mock;
  let mockedReadFileSync: jest.Mock;

  beforeEach(async () => {
    jest.mock("fs", () => ({ existsSync: jest.fn(), readFileSync: jest.fn() }));
    const { existsSync, readFileSync } = await import("fs");
    mockedExistsSync = existsSync as jest.Mock;
    mockedReadFileSync = readFileSync as jest.Mock;
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env["DOCKER_HOST"];
    delete process.env["DOCKER_TLS_VERIFY"];
    delete process.env["DOCKER_CERT_PATH"];
  });

  describe("does not exist", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(false);
    });

    it("should not set anything", async () => {
      await import("./testcontainers-properties-file");

      expect(process.env.DOCKER_HOST).toBeUndefined();
      expect(process.env.DOCKER_TLS_VERIFY).toBeUndefined();
      expect(process.env.DOCKER_CERT_PATH).toBeUndefined();

      jest.resetModules();
    });
  });

  describe("exists", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(true);
    });

    it("should set the host", async () => {
      mockedReadFileSync.mockReturnValueOnce("docker.host=tcp://my.docker.host:1234");

      await import("./testcontainers-properties-file");

      expect(process.env.DOCKER_HOST).toBe("tcp://my.docker.host:1234");
      expect(process.env.DOCKER_TLS_VERIFY).toBeUndefined();
      expect(process.env.DOCKER_CERT_PATH).toBeUndefined();
    });

    it("should set TLS verify", async () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
      `);

      await import("./testcontainers-properties-file");

      expect(process.env.DOCKER_HOST).toBe("tcp://my.docker.host:1234");
      expect(process.env.DOCKER_TLS_VERIFY).toBe("1");
      expect(process.env.DOCKER_CERT_PATH).toBeUndefined();
    });

    it("should set the cert path", async () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
        docker.cert.path=/some/path
      `);

      await import("./testcontainers-properties-file");

      expect(process.env.DOCKER_HOST).toBe("tcp://my.docker.host:1234");
      expect(process.env.DOCKER_TLS_VERIFY).toBe("1");
      expect(process.env.DOCKER_CERT_PATH).toBe("/some/path");
    });
  });
});
