export const getRemoteDockerUnixSocketPath = (
  uri: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): string => {
  if (env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] !== undefined) {
    return env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"];
  }

  let socketPath: string;
  if (uri.startsWith("unix://")) {
    socketPath = uri.replace("unix://", "");
  } else {
    socketPath = "/var/run/docker.sock";
  }

  return platform === "win32" ? `/${socketPath}` : socketPath;
};
