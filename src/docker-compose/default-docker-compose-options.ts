import { IDockerComposeOptions } from "docker-compose";
import { DockerComposeOptions } from "./docker-compose-options";

export const defaultDockerComposeOptions = ({
  environment = {},
  ...options
}: DockerComposeOptions): Partial<IDockerComposeOptions> => {
  return {
    log: false,
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
