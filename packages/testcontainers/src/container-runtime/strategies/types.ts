import type { DockerOptions } from "dockerode";

export type ContainerRuntimeClientStrategyResult = {
  uri: string;
  dockerOptions: DockerOptions;
  composeEnvironment: NodeJS.ProcessEnv;
  allowUserOverrides: boolean;
};

export type ContainerRuntimeClientStrategyNotApplicable = { notApplicable: string };
