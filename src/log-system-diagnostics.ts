import { log } from "./logger";
import * as dockerCompose from "docker-compose";
import Dockerode from "dockerode";

export const logSystemDiagnostics = async (dockerode: Dockerode): Promise<void> => {
  const info = {
    node: getNodeInfo(),
    docker: await getDockerInfo(dockerode),
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

const getDockerInfo = async (dockerode: Dockerode) => {
  const info = await dockerode.info();

  return {
    serverVersion: info.ServerVersion,
    operatingSystem: info.OperatingSystem,
    operatingSystemType: info.OSType,
    architecture: info.Architecture,
    cpus: info.NCPU,
    memory: info.MemTotal,
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
  } catch {
    log.warn("Unable to detect docker-compose version, is it installed?");
    return undefined;
  }
};
