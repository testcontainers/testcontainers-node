import process from "node:process";
import { ContainerRuntimeClientStrategyResult } from "../strategies/types.ts";

export const getRemoteContainerRuntimeSocketPath = (
  containerRuntimeStrategyResult: ContainerRuntimeClientStrategyResult,
  containerRuntimeOs: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): string => {
  if (containerRuntimeStrategyResult.allowUserOverrides) {
    if (env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] !== undefined) {
      return env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"];
    }
  }

  let socketPath: string;
  if (containerRuntimeOs === "Docker Desktop") {
    socketPath = "/var/run/docker.sock";
  } else if (containerRuntimeStrategyResult.uri.startsWith("unix://")) {
    socketPath = containerRuntimeStrategyResult.uri.replace("unix://", "");
  } else {
    socketPath = "/var/run/docker.sock";
  }

  return platform === "win32" ? `/${socketPath}` : socketPath;
};
