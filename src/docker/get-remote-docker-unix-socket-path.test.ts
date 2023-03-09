import { getRemoteDockerUnixSocketPath } from "./get-remote-docker-unix-socket-path";

test("should return TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE when provided", () => {
  const actual = getRemoteDockerUnixSocketPath("unix:///var/run/docker.sock", {
    TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: "/var/run/another.sock",
  });
  expect(actual).toEqual("/var/run/another.sock");
});

test("should return /var/run/docker.sock when URI is not a unix socket", () => {
  ["tcp://localhost:2375", "npipe:////./pipe/docker_engine"].forEach((uri) => {
    const actual = getRemoteDockerUnixSocketPath(uri, {});
    expect(actual).toEqual("/var/run/docker.sock");
  });
});

test("should return path of a unix socket", () => {
  const actual = getRemoteDockerUnixSocketPath("unix:///var/run/docker.sock", {});
  expect(actual).toEqual("/var/run/docker.sock");
});
