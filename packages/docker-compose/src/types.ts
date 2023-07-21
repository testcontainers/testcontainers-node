import { Logger } from "@testcontainers/logger";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  environment?: NodeJS.ProcessEnv;
  logger?: Logger;
};

export type DockerComposeDownOptions = {
  timeout: number;
  removeVolumes: boolean;
};
