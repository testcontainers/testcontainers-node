import { Logger } from "@testcontainers/common";

export type ComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  environment?: NodeJS.ProcessEnv;
  logger?: Logger;
};

export type ComposeDownOptions = {
  timeout: number;
  removeVolumes: boolean;
};
