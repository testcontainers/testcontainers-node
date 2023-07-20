import { Environment } from "../docker/types";
import { composeLog, Logger } from "../logger";
import { IDockerComposeOptions } from "docker-compose";
import { getDockerClient } from "../docker/client/docker-client";
import { EOL } from "os";
import { isNotEmptyString } from "../type-guards";

export type DockerComposeOptions = {
  filePath: string;
  files: string | string[];
  projectName: string;
  commandOptions?: string[];
  composeOptions?: string[];
  environment?: Environment;
  logger?: Logger;
};

export const defaultDockerComposeOptions = async ({
  environment = {},
  ...options
}: DockerComposeOptions): Promise<Partial<IDockerComposeOptions>> => {
  const { composeEnvironment } = await getDockerClient();
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
      ...composeEnvironment,
      ...environment,
    },
  };
};

export type DockerComposeDownOptions = {
  timeout: number;
  removeVolumes: boolean;
};
