import Dockerode, { DockerOptions } from "dockerode";
import { HostIps } from "../lookup-host-ips";
import { SystemInfo } from "../../system-info";
import { ContainerRuntime } from "../types";
import { DockerComposeClient } from "@testcontainers/docker-compose";

export type DockerClient = PartialDockerClient & {
  sessionId: string;
};

export type PartialDockerClient = DockerClientStrategyResult & {
  dockerode: Dockerode;
  dockerComposeClient: DockerComposeClient;
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
