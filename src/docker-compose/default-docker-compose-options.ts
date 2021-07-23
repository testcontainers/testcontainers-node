import { IDockerComposeOptions } from "docker-compose";
import { DockerComposeOptions } from "./docker-compose-options";

export const defaultDockerComposeOptions = ({
  env = {},
  ...options
}: DockerComposeOptions): Partial<IDockerComposeOptions> => {
  return {
    log: false,
    cwd: options.filePath,
    config: options.files,
    commandOptions: options.commandOptions,
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: options.projectName,
      ...env,
    },
  };
};
