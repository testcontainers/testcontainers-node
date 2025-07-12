import { GetContainerRuntimeConfig } from "./config";

const mockExistsSync = vi.fn();
vi.mock("fs", () => ({ existsSync: mockExistsSync }));
const mockReadFile = vi.fn();
vi.mock("fs/promises", () => ({ readFile: mockReadFile }));

describe.sequential("Config", () => {
  let getContainerRuntimeConfig: GetContainerRuntimeConfig;

  beforeEach(async () => {
    getContainerRuntimeConfig = (await import("./config")).getContainerRuntimeConfig;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should not set anything", async () => {
    const dockerClientConfig = await getContainerRuntimeConfig({});

    expect(dockerClientConfig.dockerHost).toBeUndefined();
    expect(dockerClientConfig.dockerTlsVerify).toBeUndefined();
    expect(dockerClientConfig.dockerCertPath).toBeUndefined();
  });

  describe("environment", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it("should set the host", async () => {
      const dockerClientConfig = await getContainerRuntimeConfig({
        DOCKER_HOST: "tcp://my.docker.host:1234",
      });

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBeUndefined();
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set TLS verify", async () => {
      const dockerClientConfig = await getContainerRuntimeConfig({
        DOCKER_HOST: "tcp://my.docker.host:1234",
        DOCKER_TLS_VERIFY: "1",
      });

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set the cert path", async () => {
      const dockerClientConfig = await getContainerRuntimeConfig({
        DOCKER_HOST: "tcp://my.docker.host:1234",
        DOCKER_TLS_VERIFY: "1",
        DOCKER_CERT_PATH: "/some/path",
      });

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBe("/some/path");
    });
  });

  describe("testcontainers.properties file", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    it("should set the tc host", async () => {
      mockReadFile.mockResolvedValueOnce("tc.host=tcp://my.docker.host:1234");

      const dockerClientConfig = await getContainerRuntimeConfig({});

      expect(dockerClientConfig.tcHost).toBe("tcp://my.docker.host:1234");
    });

    it("should set the host", async () => {
      mockReadFile.mockResolvedValueOnce("docker.host=tcp://my.docker.host:1234");

      const dockerClientConfig = await getContainerRuntimeConfig({});

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBeUndefined();
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set TLS verify", async () => {
      mockReadFile.mockResolvedValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
      `);

      const dockerClientConfig = await getContainerRuntimeConfig({});

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set the cert path", async () => {
      mockReadFile.mockResolvedValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
        docker.cert.path=/some/path
      `);

      const dockerClientConfig = await getContainerRuntimeConfig({});

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBe("/some/path");
    });
  });

  it("should cache the result", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValueOnce("tc.host=tcp://my.docker.host:1234");

    await getContainerRuntimeConfig({});
    const dockerClientConfig = await getContainerRuntimeConfig({});

    expect(dockerClientConfig.tcHost).toBe("tcp://my.docker.host:1234");
    expect(mockExistsSync).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });
});
