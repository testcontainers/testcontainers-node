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
  });

  describe("does not exist", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(false);
    });

    it("should not set anything", async () => {
      const properties = await import("./testcontainers-properties-file");

      expect(properties.dockerHost).toBeUndefined();
      expect(properties.dockerTlsVerify).toBeUndefined();
      expect(properties.dockerCertPath).toBeUndefined();

      jest.resetModules();
    });
  });

  describe("exists", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(true);
    });

    it("should set the host", async () => {
      mockedReadFileSync.mockReturnValueOnce("docker.host=tcp://my.docker.host:1234");

      const properties = await import("./testcontainers-properties-file");

      expect(properties.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(properties.dockerTlsVerify).toBeUndefined();
      expect(properties.dockerCertPath).toBeUndefined();
    });

    it("should set TLS verify", async () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
      `);

      const properties = await import("./testcontainers-properties-file");

      expect(properties.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(properties.dockerTlsVerify).toBe("1");
      expect(properties.dockerCertPath).toBeUndefined();
    });

    it("should set the cert path", async () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
        docker.cert.path=/some/path
      `);

      const properties = await import("./testcontainers-properties-file");

      expect(properties.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(properties.dockerTlsVerify).toBe("1");
      expect(properties.dockerCertPath).toBe("/some/path");
    });
  });
});
