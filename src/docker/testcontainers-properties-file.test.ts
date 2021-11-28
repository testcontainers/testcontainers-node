import { existsSync, readFileSync } from "fs";
import { readTestcontainersPropertiesFile } from "./testcontainers-properties-file";

jest.mock("fs", () => ({ existsSync: jest.fn(), readFileSync: jest.fn() }));

const mockedExistsSync = existsSync as jest.Mock;
const mockedReadFileSync = readFileSync as jest.Mock;

describe("testcontainers properties file", () => {
  describe("does not exist", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(false);
    });

    it("should return undefined", () => {
      expect(readTestcontainersPropertiesFile()).toBeUndefined();
    });
  });

  describe("exists", () => {
    beforeEach(() => {
      mockedExistsSync.mockReturnValue(true);
    });

    it("should return the host", () => {
      mockedReadFileSync.mockReturnValueOnce("docker.host=tcp://my.docker.host:1234");

      const properties = readTestcontainersPropertiesFile();

      expect(properties).toStrictEqual({ host: "tcp://my.docker.host:1234" });
    });

    it("should return the host without certificate if tls verify is disabled", () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=0
        docker.cert.path=/some/path
      `);

      const properties = readTestcontainersPropertiesFile();

      expect(properties).toStrictEqual({ host: "tcp://my.docker.host:1234" });
    });

    it("should return the host and certificate if tls verify is enabled", () => {
      mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=1
        docker.cert.path=/some/path
      `);

      const properties = readTestcontainersPropertiesFile();

      expect(properties).toStrictEqual({
        host: "tcp://my.docker.host:1234",
        ca: "/some/path/ca.pem",
        cert: "/some/path/cert.pem",
        key: "/some/path/key.pem",
      });
    });
  });
});
