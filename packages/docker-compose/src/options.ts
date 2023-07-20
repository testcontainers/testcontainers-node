import { composeLog, Logger } from "@testcontainers/logger";
import { isNotEmptyString } from "@testcontainers/common";
import { IDockerComposeOptions } from "docker-compose";
import { EOL } from "os";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  environment?: NodeJS.ProcessEnv;
  logger?: Logger;
};

export const defaultDockerComposeOptions = async ({
  environment = {},
  ...options
}: DockerComposeOptions): Promise<Partial<IDockerComposeOptions>> => {
  const log = options.logger ?? composeLog;

  return {
    log: false,
    callback: log.enabled()
      ? (chunk) => {
          chunk
            .toString()
            .split(EOL)
            .filter(isNotEmptyString)
            .forEach((line) => log.trace(line.trim()));
        }
      : undefined,
    cwd: options.filePath,
    config: options.files,
    composeOptions: options.composeOptions,
    commandOptions: options.commandOptions,
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: options.projectName,
      ...environment,
    },
  };
};

export type DockerComposeDownOptions = {
  timeout: number;
  removeVolumes: boolean;
};
