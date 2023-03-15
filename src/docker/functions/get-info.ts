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

  return {
    serverVersion: info.ServerVersion,
    operatingSystem: info.OperatingSystem,
    operatingSystemType: info.OSType,
    architecture: info.Architecture,
    cpus: info.NCPU,
    memory: info.MemTotal,
    indexServerAddress: getIndexServerAddress(info),
  };
};

// https://github.com/containers/podman/issues/17776
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getIndexServerAddress = (info: any): string => {
  if (isUndefinedOrEmpty(info.IndexServerAddress)) {
    log.debug("Index server address is not set, using default");
    return "https://index.docker.io/v1/";
  } else {
    return info.IndexServerAddress;
  }
};

const isUndefinedOrEmpty = (value: string | undefined): boolean => value === undefined || value.length === 0;
