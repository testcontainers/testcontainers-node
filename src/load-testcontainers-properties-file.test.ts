import { existsSync, readFileSync } from "fs";
import { loadTestcontainersPropertiesFile } from "./load-testcontainers-properties-file";

jest.mock("fs", () => ({ existsSync: jest.fn(), readFileSync: jest.fn() }));

const mockedExistsSync = existsSync as jest.Mock;
const mockedReadFileSync = readFileSync as jest.Mock;

describe("load testcontainers properties file", () => {
  describe("does not exist", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(false);
    });

    it("should not set anything", () => {
      loadTestcontainersPropertiesFile();

      expect(process.env.DOCKER_HOST).toBeUndefined();
      expect(process.env.DOCKER_TLS_VERIFY).toBeUndefined();
      expect(process.env.DOCKER_CERT_PATH).toBeUndefined();
    });
  });

  describe("exists", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(true);
    });

    it("should set the host", () => {
      mockedReadFileSync.mockReturnValueOnce("docker.host=tcp://my.docker.host:1234");

      loadTestcontainersPropertiesFile();

      expect(process.env.DOCKER_HOST).toBe("tcp://my.docker.host:1234");
      expect(process.env.DOCKER_TLS_VERIFY).toBeUndefined();
      expect(process.env.DOCKER_CERT_PATH).toBeUndefined();
    });

    it("should set TLS verify", () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
      `);

      loadTestcontainersPropertiesFile();

      expect(process.env.DOCKER_HOST).toBe("tcp://my.docker.host:1234");
      expect(process.env.DOCKER_TLS_VERIFY).toBe("1");
      expect(process.env.DOCKER_CERT_PATH).toBeUndefined();
    });

    it("should set the cert path", () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
        docker.cert.path=/some/path
      `);

      loadTestcontainersPropertiesFile();

      expect(process.env.DOCKER_HOST).toBe("tcp://my.docker.host:1234");
      expect(process.env.DOCKER_TLS_VERIFY).toBe("1");
      expect(process.env.DOCKER_CERT_PATH).toBe("/some/path");
    });
  });
});
