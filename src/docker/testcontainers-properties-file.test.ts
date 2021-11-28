import { existsSync, readFileSync } from "fs";
import { readTestcontainersPropertiesFile } from "./testcontainers-properties-file";

jest.mock("fs", () => ({ existsSync: jest.fn(), readFileSync: jest.fn() }));

const mockedExistsSync = existsSync as jest.Mock;
const mockedReadFileSync = readFileSync as jest.Mock;

describe("testcontainers properties file", () => {
  it("should return undefined when properties file does not exist", () => {
    mockedExistsSync.mockReturnValueOnce(false);

    const properties = readTestcontainersPropertiesFile();

    expect(properties).toBeUndefined();
  });

  it("should return the host", () => {
    mockedExistsSync.mockReturnValueOnce(true);
    mockedReadFileSync.mockReturnValueOnce("docker.host=tcp://my.docker.host:1234");

    const properties = readTestcontainersPropertiesFile();

    expect(properties).toStrictEqual({ host: "tcp://my.docker.host:1234" });
  });

  it("should return the host without certificate if tls verify is disabled", () => {
    mockedExistsSync.mockReturnValueOnce(true);
    mockedReadFileSync.mockReturnValueOnce(`
        docker.host=tcp://my.docker.host:1234
        docker.tls.verify=0
        docker.cert.path=/some/path
      `);

    const properties = readTestcontainersPropertiesFile();

    expect(properties).toStrictEqual({ host: "tcp://my.docker.host:1234" });
  });

  it("should return the host and certificate", () => {
    mockedExistsSync.mockReturnValueOnce(true);
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
