import { Environment } from "../docker/types.js";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  env?: Environment;
};
