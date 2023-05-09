import { Environment } from "../docker/types";
import { Logger } from "../logger";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  environment?: Environment;
  logger?: Logger;
};
