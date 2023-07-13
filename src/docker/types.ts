import { Readable } from "stream";

export type ContainerRuntime = "docker" | "podman";

export type Environment = { [key in string]: string };

export type BindMode = "rw" | "ro" | "z" | "Z";

export type BindMount = {
  source: string;
  target: string;
  mode?: BindMode;
};

export type FileToCopy = {
  source: string;
  target: string;
  mode?: number;
};

export type DirectoryToCopy = FileToCopy;

export type Content = string | Buffer | Readable;

export type ContentToCopy = {
  content: Content;
  target: string;
  mode?: number;
};

export type TmpFs = { [dir in string]: string };

export type Ulimits = { [name: string]: { hard: number | undefined; soft: number | undefined } };

export type ResourcesQuota = {
  memory?: number; // Memory limit in Gigabytes
  cpu?: number; // CPU quota in units of CPUs
};

export type HealthCheck = {
  test: ["CMD-SHELL", string] | ["CMD", ...string[]];
  interval?: number;
  timeout?: number;
  retries?: number;
  startPeriod?: number;
};

export type ExtraHost = {
  host: string;
  ipAddress: string;
};

export type Labels = { [key: string]: string };

export type HostPortBindings = Array<{ hostIp: string; hostPort: number }>;
export type Ports = { [containerPort: number]: HostPortBindings };

export type AuthConfig = {
  username: string;
  password: string;
  registryAddress: string;
  email?: string;
};

export type RegistryConfig = {
  [registryAddress: string]: {
    username: string;
    password: string;
  };
};

export type BuildArgs = { [key in string]: string };

export type ExecResult = { output: string; exitCode: number };

export type HealthCheckStatus = "none" | "starting" | "unhealthy" | "healthy";

export type NetworkSettings = {
  networkId: string;
  ipAddress: string;
};
