export type Environment = { [key in string]: string };

export type ExecOptions = { workingDir: string; user: string; env: Environment; log: boolean };

export type ExecResult = { output: string; exitCode: number };
