import { Env } from "../docker/types";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  commandOptions?: string[];
  env?: Env;
};
