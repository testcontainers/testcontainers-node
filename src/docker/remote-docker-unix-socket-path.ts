import { DockerClient } from "./client/docker-client";

export const getRemoteDockerUnixSocketPath = (
  dockerClient: DockerClient,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): string => {
  if (env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] !== undefined) {
    return env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"];
  }

  let socketPath: string;
  if (dockerClient.info.dockerInfo.operatingSystem === "Docker Desktop") {
    socketPath = "/run/guest-services/docker.sock";
  } else if (dockerClient.uri.startsWith("unix://")) {
    socketPath = dockerClient.uri.replace("unix://", "");
  } else {
    socketPath = "/var/run/docker.sock";
  }

  return platform === "win32" ? `/${socketPath}` : socketPath;
};
