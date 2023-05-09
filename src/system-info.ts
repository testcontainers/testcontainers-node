import { log } from "./logger";
import { version as dockerComposeVersion } from "docker-compose";
import { DockerInfo, getDockerInfo } from "./docker/functions/get-info";
import Dockerode from "dockerode";

let systemInfo: SystemInfo;

export type SystemInfo = {
  nodeInfo: NodeInfo;
  dockerInfo: DockerInfo;
  dockerComposeInfo?: DockerComposeInfo;
};

export const getSystemInfo = async (dockerode: Dockerode): Promise<SystemInfo> => {
  if (systemInfo !== undefined) {
    return systemInfo;
  }

  log.debug("Fetching system info...");
  const nodeInfo = getNodeInfo();
  const dockerInfo = await getDockerInfo(dockerode);
  const dockerComposeInfo = await getDockerComposeInfo();
  systemInfo = { nodeInfo, dockerInfo, dockerComposeInfo };

  log.debug(
    `Node version: ${nodeInfo.version}, Platform: ${nodeInfo.platform}, Arch: ${nodeInfo.architecture}, OS: ${
      dockerInfo.operatingSystem
    }, Version: ${dockerInfo.serverVersion}, Arch: ${dockerInfo.architecture}, CPUs: ${dockerInfo.cpus}, Memory: ${
      dockerInfo.memory
    }, Compose installed: ${dockerComposeInfo !== undefined}, Compose version: ${dockerComposeInfo?.version ?? "N/A"}`
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

export type DockerComposeInfo = {
  version: string;
};

const getDockerComposeInfo = async (): Promise<DockerComposeInfo | undefined> => {
  try {
    return {
      version: (await dockerComposeVersion()).data.version,
    };
  } catch (err) {
    log.info(`Unable to detect docker-compose version, is it installed? ${err}`);
    return undefined;
  }
};
