import Dockerode, { DockerOptions } from "dockerode";

// export type PartialDockerClient = DockerClientStrategyResult & {
//   dockerode: Dockerode;
//   dockerComposeClient: DockerComposeClient;
//   host: string;
//   containerRuntime: ContainerRuntime;
//   hostIps: HostIps;
//   info: SystemInfo;
// };

export type ContainerRuntimeClientStrategyResult = {
  uri: string;
  dockerOptions: DockerOptions;
  composeEnvironment: NodeJS.ProcessEnv;
  allowUserOverrides: boolean;
};
