import Dockerode from "dockerode";

type DockerInfo = {
  serverVersion: number;
  operatingSystem: string;
  operatingSystemType: string;
  architecture: string;
  cpus: number;
  memory: number;
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
  };
};
