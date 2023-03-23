import { IDockerComposeOptions } from "docker-compose";
import { DockerComposeOptions } from "./docker-compose-options";
import { dockerClient } from "../docker/docker-client";
import { log } from "../logger";
import { EOL } from "os";
import { isNotEmptyString } from "../type-guards";

export const defaultDockerComposeOptions = async ({
  environment = {},
  ...options
}: DockerComposeOptions): Promise<Partial<IDockerComposeOptions>> => {
  const { composeEnvironment } = await dockerClient();

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
