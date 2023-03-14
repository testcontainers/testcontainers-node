import Dockerode from "dockerode";
import { log } from "../../logger";

export type DockerInfo = {
  serverVersion: number;
  operatingSystem: string;
  operatingSystemType: string;
  architecture: string;
  cpus: number;
  memory: number;
  indexServerAddress: string;
};

export const getDockerInfo = async (dockerode: Dockerode): Promise<DockerInfo> => {
  const info = await dockerode.info();

  let indexServerAddress: string;
  if (info.IndexServerAddress === undefined || info.IndexServerAddress.length === 0) {
    log.debug("Index server address is not set, using default");
    indexServerAddress = "https://index.docker.io/v1/";
  } else {
    indexServerAddress = info.IndexServerAddress;
  }

  return {
    serverVersion: info.ServerVersion,
    operatingSystem: info.OperatingSystem,
    operatingSystemType: info.OSType,
    architecture: info.Architecture,
    cpus: info.NCPU,
    memory: info.MemTotal,
    indexServerAddress,
  };
};
