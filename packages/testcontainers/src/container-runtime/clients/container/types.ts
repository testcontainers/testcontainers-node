export type Environment = { [key in string]: string };

export type ExecOptions = { workingDir: string; user: string; env: Environment; log: boolean };

export type ExecResult = { output: string; exitCode: number };

export const CONTAINER_STATUSES = ["created", "restarting", "running", "removing", "paused", "exited", "dead"] as const;

export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];
