import { readFile } from "fs/promises";
import { ConfigurationStrategy } from "./configuration-strategy";
import { getContainerRuntimeConfig } from "./utils/config";

vi.mock("./utils/config");
vi.mock("fs/promises");

const mockGetContainerRuntimeConfig = vi.mocked(getContainerRuntimeConfig);
const mockReadFile = vi.mocked(readFile);

describe("ConfigurationStrategy", () => {
  it("should return undefined if no docker host is set", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValueOnce({ dockerHost: undefined });

    const result = await new ConfigurationStrategy().getResult();

    expect(result).toBeUndefined();
  });

  it("should set host and port when docker host is a URL", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValueOnce({ dockerHost: "tcp://docker:8025" });

    const result = await new ConfigurationStrategy().getResult();

    expect(result?.uri).toEqual("tcp://docker:8025");
    expect(result?.dockerOptions).toEqual(
      expect.objectContaining({
        host: "docker",
        port: "8025",
      })
    );
    expect(result?.composeEnvironment).toEqual(
      expect.objectContaining({
        DOCKER_HOST: "tcp://docker:8025",
      })
    );
  });

  it("should set socket path when docker host is a path", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValueOnce({ dockerHost: "unix:///var/run/docker.sock" });

    const result = await new ConfigurationStrategy().getResult();

    expect(result?.uri).toEqual("unix:///var/run/docker.sock");
    expect(result?.dockerOptions).toEqual(
      expect.objectContaining({
        socketPath: "/var/run/docker.sock",
      })
    );
    expect(result?.composeEnvironment).toEqual(
      expect.objectContaining({
        DOCKER_HOST: "unix:///var/run/docker.sock",
      })
    );
  });

  it("should allow user overrides", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValueOnce({ dockerHost: "tcp://docker:8025" });

    const result = await new ConfigurationStrategy().getResult();

    expect(result?.allowUserOverrides).toEqual(true);
  });

  it("should set SSL options when TLS is enabled", async () => {
    mockGetContainerRuntimeConfig.mockResolvedValueOnce({
      dockerHost: "tcp://docker:8025",
      dockerTlsVerify: "1",
      dockerCertPath: "/certs",
    });
    mockReadFile.mockImplementation(async (path) => {
      if (path === "/certs/ca.pem") return "ca";
      if (path === "/certs/cert.pem") return "cert";
      if (path === "/certs/key.pem") return "key";
      throw new Error(`Unexpected path: ${path}`);
    });

    const result = await new ConfigurationStrategy().getResult();

    expect(result?.uri).toEqual("tcp://docker:8025");
    expect(result?.dockerOptions).toEqual(
      expect.objectContaining({
        ca: "ca",
        cert: "cert",
        key: "key",
      })
    );
    expect(result?.composeEnvironment).toEqual(
      expect.objectContaining({
        DOCKER_TLS_VERIFY: "1",
        DOCKER_CERT_PATH: "/certs",
      })
    );
  });
});
