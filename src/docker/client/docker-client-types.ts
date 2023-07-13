import Dockerode, { DockerOptions } from "dockerode";
import { HostIps } from "../lookup-host-ips";
import { SystemInfo } from "../../system-info";
import { ContainerRuntime } from "../types";

export type DockerClient = PartialDockerClient & {
  sessionId: string;
};

export type PartialDockerClient = DockerClientStrategyResult & {
  dockerode: Dockerode;
  host: string;
  containerRuntime: ContainerRuntime;
  hostIps: HostIps;
  info: SystemInfo;
};

export type DockerClientStrategyResult = {
  uri: string;
  dockerOptions: DockerOptions;
  composeEnvironment: NodeJS.ProcessEnv;
  allowUserOverrides: boolean;
};
