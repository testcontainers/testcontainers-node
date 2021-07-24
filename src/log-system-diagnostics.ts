import { log } from "./logger";
import * as dockerCompose from "docker-compose";
import { getDockerInfo } from "./docker/functions/get-info";

export const logSystemDiagnostics = async (): Promise<void> => {
  const info = {
    node: getNodeInfo(),
    docker: await getDockerInfo(),
    dockerCompose: await getDockerComposeInfo(),
  };

  log.debug(`System diagnostics: ${JSON.stringify(info, null, 2)}`);
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
      version: (await dockerCompose.version()).data.version,
    };
  } catch (err) {
    log.warn(`Unable to detect docker-compose version, is it installed? ${err}`);
    return undefined;
  }
};
