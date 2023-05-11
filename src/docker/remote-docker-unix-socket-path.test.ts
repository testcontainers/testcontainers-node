import { getRemoteDockerUnixSocketPath } from "./remote-docker-unix-socket-path";
import { DockerClient } from "./client/docker-client";

test("should return TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE when provided", () => {
  const dockerClient = createDockerClient("unix:///var/run/docker.sock");
  const actual = getRemoteDockerUnixSocketPath(dockerClient, "linux", {
    TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: "/var/run/another.sock",
  });
  expect(actual).toEqual("/var/run/another.sock");
});

test("should return /run/guest-services/docker.sock on Docker Desktop", () => {
  const dockerClient = createDockerClient("unix:///var/run/docker.sock", "Docker Desktop");
  const actual = getRemoteDockerUnixSocketPath(dockerClient, "linux", {});
  expect(actual).toEqual("/run/guest-services/docker.sock");
});

test("should return /var/run/docker.sock when URI is not a unix socket", () => {
  ["tcp://localhost:2375", "npipe:////./pipe/docker_engine"].forEach((uri) => {
    const dockerClient = createDockerClient(uri);
    const actual = getRemoteDockerUnixSocketPath(dockerClient, "linux", {});
    expect(actual).toEqual("/var/run/docker.sock");
  });
});

test("should return path of a unix socket", () => {
  const actual = getRemoteDockerUnixSocketPath(createDockerClient("unix:///var/run/docker.sock"), "linux", {});
  expect(actual).toEqual("/var/run/docker.sock");
});

test("should return path of a unix socket", () => {
  const actual = getRemoteDockerUnixSocketPath(createDockerClient("unix:///var/run/docker.sock"), "linux", {});
  expect(actual).toEqual("/var/run/docker.sock");
});

test("should prepend / to follow the UNC for Windows", () => {
  const actual = getRemoteDockerUnixSocketPath(createDockerClient("unix:///var/run/docker.sock"), "win32", {});
  expect(actual).toEqual("//var/run/docker.sock");
});

function createDockerClient(uri: string, os = "") {
  return { uri, info: { dockerInfo: { operatingSystem: os } } } as DockerClient;
}
