import { log } from "@testcontainers/logger";
import { DockerInfo, getDockerInfo } from "./docker/functions/get-info";
import Dockerode from "dockerode";
import { DockerComposeClient } from "@testcontainers/docker-compose";

let systemInfo: SystemInfo;

export type SystemInfo = {
  nodeInfo: NodeInfo;
  dockerInfo: DockerInfo;
  dockerComposeInfo?: { version: string };
};

export const getSystemInfo = async (
  dockerode: Dockerode,
  dockerComposeClient: DockerComposeClient
): Promise<SystemInfo> => {
  if (systemInfo !== undefined) {
    return systemInfo;
  }

  log.debug("Fetching system info...");
  const nodeInfo = getNodeInfo();
  const dockerInfo = await getDockerInfo(dockerode);
  const dockerComposeInfo = { version: dockerComposeClient.version };
  systemInfo = { nodeInfo, dockerInfo, dockerComposeInfo };

  log.debug(
    `Node version: ${nodeInfo.version}, Platform: ${nodeInfo.platform}, Arch: ${nodeInfo.architecture}, OS: ${
      dockerInfo.operatingSystem
    }, Version: ${dockerInfo.serverVersion}, Arch: ${dockerInfo.architecture}, CPUs: ${dockerInfo.cpus}, Memory: ${
      dockerInfo.memory
    }, Compose version: ${dockerComposeInfo?.version ?? "N/A"}`
  );

  return systemInfo;
};

type NodeInfo = {
  version: string;
  architecture: string;
  platform: string;
};

const getNodeInfo = () => {
  return {
    version: process.version,
    architecture: process.arch,
    platform: process.platform,
  };
};
