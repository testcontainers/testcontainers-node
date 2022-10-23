import { log } from "./logger.js";
import { version as dockerComposeVersion } from "./docker-compose/docker-compose.js";
import { getDockerInfo } from "./docker/functions/get-info.js";
import Dockerode from "dockerode";

export const logSystemDiagnostics = async (dockerode: Dockerode): Promise<void> => {
  log.debug("Fetching system diagnostics");

  const info = {
    node: getNodeInfo(),
    docker: await getDockerInfo(dockerode),
    dockerCompose: await getDockerComposeInfo(),
  };

  log.debug(`System diagnostics: ${JSON.stringify(info)}`);
};

const getNodeInfo = () => {
  return {
    version: process.version,
    architecture: process.arch,
    platform: process.platform,
  };
};

type DockerComposeInfo = {
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
