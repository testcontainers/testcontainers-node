import Dockerode from "dockerode";
import { ContainerRuntimeClientStrategyResult } from "../strategies/types";
import { resolveHost } from "./resolve-host";

const mockExistsSync = vi.fn();
vi.mock("fs", () => ({
  existsSync: () => mockExistsSync(),
}));

const mockInspectNetwork = vi.fn();
const mockGetNetwork = vi.fn();
vi.mock("dockerode", () => {
  return {
    default: vi.fn(() => ({
      getNetwork: (...args: unknown[]) => {
        mockGetNetwork.mockImplementation(() => ({
          inspect: mockInspectNetwork,
        }));
        return mockGetNetwork(...args);
      },
    })),
  };
});

const runInContainerMock = vi.fn();
vi.mock("./run-in-container", () => ({
  runInContainer: () => runInContainerMock(),
}));

test("should return TESTCONTAINERS_HOST_OVERRIDE from environment", async () => {
  const strategyResult = {
    uri: "tcp://another:2375",
    allowUserOverrides: true,
  } as ContainerRuntimeClientStrategyResult;

  const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {
    TESTCONTAINERS_HOST_OVERRIDE: "tcp://another:2375",
  });

  expect(host).toEqual("tcp://another:2375");
});

test("should return hostname for TCP protocols", async () => {
  for (const uri of ["tcp://docker:2375", "http://docker:2375", "https://docker:2375"]) {
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

    expect(host).toEqual("docker");
  }
});

test("should not return TESTCONTAINERS_HOST_OVERRIDE when allow user override is false", async () => {
  const strategyResult = {
    uri: "tcp://docker:2375",
    allowUserOverrides: false,
  } as ContainerRuntimeClientStrategyResult;

  const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {
    TESTCONTAINERS_HOST_OVERRIDE: "tcp://another:2375",
  });

  expect(host).toEqual("docker");
});

test("should return localhost for unix and npipe protocols when not running in a container", async () => {
  mockExistsSync.mockReturnValue(false);

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

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
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

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
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

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

  for (const uri of ["unix://podman.sock", "npipe://podman.sock"]) {
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

    expect(mockGetNetwork).toHaveBeenCalledWith("podman");
  }
});

test("should return host from default gateway when running in a container", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({});
  runInContainerMock.mockResolvedValue("172.0.0.2");

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

    expect(host).toEqual("172.0.0.2");
  }
});

test("should return localhost if unable to find gateway", async () => {
  mockExistsSync.mockReturnValue(true);
  mockInspectNetwork.mockResolvedValue({});
  runInContainerMock.mockResolvedValue(undefined);

  for (const uri of ["unix://docker:2375", "npipe://docker:2375"]) {
    const strategyResult = {
      uri,
      allowUserOverrides: true,
    } as ContainerRuntimeClientStrategyResult;

    const host = await resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {});

    expect(host).toEqual("localhost");
  }
});

test("should throw for unsupported protocol", async () => {
  const strategyResult = {
    uri: "invalid://unknown",
    allowUserOverrides: true,
  } as ContainerRuntimeClientStrategyResult;

  await expect(() => resolveHost(new Dockerode(), strategyResult, "indexServerAddress", {})).rejects.toThrowError(
    "Unsupported protocol: invalid"
  );
});
