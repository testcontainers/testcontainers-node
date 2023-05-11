import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { getDockerClientConfig } from "./docker-client-config";

jest.mock("fs", () => ({ existsSync: jest.fn() }));
jest.mock("fs/promises", () => ({ readFile: jest.fn() }));

const mockedExistsSync = jest.mocked(existsSync);
const mockedReadFile = jest.mocked(readFile);

describe("getDockerClientConfig", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("should not set anything", async () => {
    const dockerClientConfig = await getDockerClientConfig({});

    expect(dockerClientConfig.dockerHost).toBeUndefined();
    expect(dockerClientConfig.dockerTlsVerify).toBeUndefined();
    expect(dockerClientConfig.dockerCertPath).toBeUndefined();
  });

  describe("environment", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(false);
    });

    it("should set the host", async () => {
      const dockerClientConfig = await getDockerClientConfig({
        DOCKER_HOST: "tcp://my.docker.host:1234",
      });

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBeUndefined();
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set TLS verify", async () => {
      const dockerClientConfig = await getDockerClientConfig({
        DOCKER_HOST: "tcp://my.docker.host:1234",
        DOCKER_TLS_VERIFY: "1",
      });

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set the cert path", async () => {
      const dockerClientConfig = await getDockerClientConfig({
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
      mockedExistsSync.mockReturnValue(true);
    });

    it("should set the tc host", async () => {
      mockedReadFile.mockResolvedValueOnce("tc.host=tcp://my.docker.host:1234");

      const dockerClientConfig = await getDockerClientConfig({});

      expect(dockerClientConfig.tcHost).toBe("tcp://my.docker.host:1234");
    });

    it("should set the host", async () => {
      mockedReadFile.mockResolvedValueOnce("docker.host=tcp://my.docker.host:1234");

      const dockerClientConfig = await getDockerClientConfig({});

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBeUndefined();
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set TLS verify", async () => {
      mockedReadFile.mockResolvedValueOnce(`
            docker.host=tcp://my.docker.host:1234
            docker.tls.verify=1
          `);

      const dockerClientConfig = await getDockerClientConfig({});

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBeUndefined();
    });

    it("should set the cert path", async () => {
      mockedReadFile.mockResolvedValueOnce(`
            docker.host=tcp://my.docker.host:1234
            docker.tls.verify=1
            docker.cert.path=/some/path
          `);

      const dockerClientConfig = await getDockerClientConfig({});

      expect(dockerClientConfig.dockerHost).toBe("tcp://my.docker.host:1234");
      expect(dockerClientConfig.dockerTlsVerify).toBe("1");
      expect(dockerClientConfig.dockerCertPath).toBe("/some/path");
    });
  });
});
