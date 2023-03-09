export const getRemoteDockerUnixSocketPath = (uri: string, env: NodeJS.ProcessEnv = process.env): string => {
  if (env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] !== undefined) {
    return env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"];
  }

  if (uri.startsWith("unix://")) {
    return uri.replace("unix://", "");
  } else {
    return "/var/run/docker.sock";
  }
};
