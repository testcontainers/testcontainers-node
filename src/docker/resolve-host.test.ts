import { resolveHost } from "./resolve-host";
import Dockerode from "dockerode";

const mockExistsSync = jest.fn();
jest.mock("fs", () => ({
  existsSync: () => mockExistsSync(),
}));

const mockInspectNetwork = jest.fn();
const mockGetNetwork = jest.fn();
jest.mock(
  "dockerode",
  () =>
    function () {
      return {
        getNetwork: (...args: unknown[]) => {
          mockGetNetwork.mockImplementation(() => ({
            inspect: mockInspectNetwork,
          }));
          return mockGetNetwork(...args);
        },
      };
    }
);

const runInContainerMock = jest.fn();
jest.mock("./functions/run-in-container", () => ({
  runInContainer: () => runInContainerMock(),
}));

test("should return TESTCONTAINERS_HOST_OVERRIDE from environment", async () => {
  const host = await resolveHost(new Dockerode(), "docker", "", "", true, {
    TESTCONTAINERS_HOST_OVERRIDE: "tcp://another:2375",
  });
  expect(host).toEqual("tcp://another:2375");
});

test("should return hostname for TCP protocols", async () => {
  for (const uri of ["tcp://docker:2375", "http://docker:2375", "https://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "docker", "", uri, true, {});
    expect(host).toEqual("docker");
  }
});

test("should not return TESTCONTAINERS_HOST_OVERRIDE when allow user override is false", async () => {
  const host = await resolveHost(new Dockerode(), "docker", "", "tcp://docker:2375", false, {
    TESTCONTAINERS_HOST_OVERRIDE: "tcp://another:2375",
  });
  expect(host).toEqual("docker");
});

test("should return localhost for unix and npipe protocols when not running in a container", async () => {
  mockExistsSync.mockReturnValue(false);

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "docker", "", uri, true, {});
    expect(host).toEqual("localhost");
  }
});

test("should return host from gateway when running in a container", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({
    IPAM: {
      Config: [{ Gateway: "172.0.0.1" }],
    },
  });

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "docker", "", uri, true, {});
    expect(host).toEqual("172.0.0.1");
  }
});

test("should use bridge network as gateway for Docker provider", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({
    IPAM: {
      Config: [{ Gateway: "172.0.0.1" }],
    },
  });

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    await resolveHost(new Dockerode(), "docker", "", uri, true, {});
    expect(mockGetNetwork).toHaveBeenCalledWith("bridge");
  }
});

test("should use podman network as gateway for Podman provider", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({
    IPAM: {
      Config: [{ Gateway: "172.0.0.1" }],
    },
  });

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    await resolveHost(new Dockerode(), "podman", "", uri, true, {});
    expect(mockGetNetwork).toHaveBeenCalledWith("podman");
  }
});

test("should return host from default gateway when running in a container", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({});
  runInContainerMock.mockResolvedValue("172.0.0.2");

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "docker", "", uri, true, {});
    expect(host).toEqual("172.0.0.2");
  }
});

test("should return localhost if unable to find gateway", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({});
  runInContainerMock.mockResolvedValue(undefined);

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const host = await resolveHost(new Dockerode(), "docker", "", uri, true, {});
    expect(host).toEqual("localhost");
  }
});

test("should throw for unsupported protocol", async () => {
  await expect(() => resolveHost(new Dockerode(), "docker", "", "invalid://unknown", true, {})).rejects.toThrowError(
    "Unsupported protocol: invalid"
  );
});
