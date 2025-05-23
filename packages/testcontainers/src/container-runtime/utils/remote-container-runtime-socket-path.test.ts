import { ContainerRuntimeClientStrategyResult } from "../strategies/types";
import { getRemoteContainerRuntimeSocketPath } from "./remote-container-runtime-socket-path";

test("should return TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE when provided", () => {
  const strategyResult = {
    uri: "unix:///var/run/docker.sock",
    allowUserOverrides: true,
  } as ContainerRuntimeClientStrategyResult;

  const actual = getRemoteContainerRuntimeSocketPath(strategyResult, "", "linux", {
    TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: "/var/run/another.sock",
  });

  expect(actual).toEqual("/var/run/another.sock");
});

test("should return /var/run/docker.sock on Docker Desktop", () => {
  const strategyResult = {
    uri: "unix:///var/run/docker.sock",
    allowUserOverrides: true,
  } as ContainerRuntimeClientStrategyResult;

  const actual = getRemoteContainerRuntimeSocketPath(strategyResult, "Docker Desktop", "linux", {});

  expect(actual).toEqual("/var/run/docker.sock");
});

test("should return /var/run/docker.sock when URI is not a unix socket", () => {
  ["tcp://localhost:2375", "npipe:////./pipe/docker_engine"].forEach((uri) => {
    const strategyResult = { uri, allowUserOverrides: true } as ContainerRuntimeClientStrategyResult;

    const actual = getRemoteContainerRuntimeSocketPath(strategyResult, "", "linux", {});

    expect(actual).toEqual("/var/run/docker.sock");
  });
});

test("should not return TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE when allow user override is false", () => {
  const containerRuntimeStrategyResult = {
    uri: "unix:///var/run/docker.sock",
    allowUserOverrides: false,
  } as ContainerRuntimeClientStrategyResult;

  const actual = getRemoteContainerRuntimeSocketPath(containerRuntimeStrategyResult, "", "linux", {
    TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: "/var/run/another.sock",
  });

  expect(actual).toEqual("/var/run/docker.sock");
});

test("should return path of a unix socket", () => {
  const strategyResult = {
    uri: "unix:///var/run/docker.sock",
    allowUserOverrides: true,
  } as ContainerRuntimeClientStrategyResult;

  const actual = getRemoteContainerRuntimeSocketPath(strategyResult, "", "linux", {});

  expect(actual).toEqual("/var/run/docker.sock");
});

test("should prepend / to follow the UNC for Windows", () => {
  const strategyResult = {
    uri: "unix:///var/run/docker.sock",
    allowUserOverrides: true,
  } as ContainerRuntimeClientStrategyResult;

  const actual = getRemoteContainerRuntimeSocketPath(strategyResult, "", "win32", {});

  expect(actual).toEqual("//var/run/docker.sock");
});
