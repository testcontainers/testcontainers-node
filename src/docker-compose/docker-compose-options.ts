import { Env } from "../docker/types";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  env?: Env;
};
