export type Info = {
  node: NodeInfo;
  containerRuntime: ContainerRuntimeInfo;
  compose: ComposeInfo;
};

export type NodeInfo = {
  version: string;
  architecture: string;
  platform: string;
};

export type ContainerRuntimeInfo = {
  serverVersion: number;
  operatingSystem: string;
  operatingSystemType: string;
  architecture: string;
  cpus: number;
  memory: number;
  indexServerAddress: string;
};

export type ComposeInfo = {
  version: string;
  compatability: "v1" | "v2";
};
