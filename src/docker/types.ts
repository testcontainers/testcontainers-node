export type Id = string;

export type Host = string;

export type EnvKey = string;

export type EnvValue = string;

export type Env = { [key in EnvKey]: EnvValue };

export type Dir = string;

export type BindMode = "rw" | "ro" | "z" | "Z";

export type BindMount = {
  source: Dir;
  target: Dir;
  bindMode: BindMode;
};

export type TmpFs = { [dir in Dir]: Dir };

export type HealthCheck = {
  test: string;
  interval?: number;
  timeout?: number;
  retries?: number;
  startPeriod?: number;
};

export type ExtraHost = {
  host: Host;
  ipAddress: string;
};

export type NetworkMode = string;

export type ContainerName = string;

export type Ports = { [internalPort: number]: number };

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

export type BuildContext = string;

export type BuildArgs = { [key in EnvKey]: EnvValue };

export type StreamOutput = string;

export type ExitCode = number;

export type Command = string;

export type ExecResult = { output: StreamOutput; exitCode: ExitCode };

export type HealthCheckStatus = "none" | "starting" | "unhealthy" | "healthy";

export type NetworkSettings = {
  networkId: string;
  ipAddress: string;
};
