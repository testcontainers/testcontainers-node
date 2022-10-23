import { IDockerComposeOptions } from "./docker-compose.js";
import { DockerComposeOptions } from "./docker-compose-options.js";

export const defaultDockerComposeOptions = ({
  env = {},
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
      ...env,
    },
  };
};
