import { IDockerComposeExecutableOptions } from "docker-compose";
import { Logger } from "../../../common";

export type ComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  environment?: NodeJS.ProcessEnv;
  logger?: Logger;
  executable?: IDockerComposeExecutableOptions;
};

export type ComposeDownOptions = {
  timeout: number;
  removeVolumes: boolean;
};
