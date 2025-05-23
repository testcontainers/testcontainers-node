export type Environment = { [key in string]: string };

export type ExecOptions = { workingDir: string; user: string; env: Environment; log: boolean };

export type ExecResult = { output: string; stdout: string; stderr: string; exitCode: number };

export type ContainerCommitOptions = {
  repo: string;
  tag: string;
  comment?: string;
  author?: string;
  pause?: boolean;
  changes?: string;
};

export const CONTAINER_STATUSES = ["created", "restarting", "running", "removing", "paused", "exited", "dead"] as const;

export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];
