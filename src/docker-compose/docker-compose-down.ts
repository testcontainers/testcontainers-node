import * as dockerCompose from "docker-compose";
import { log } from "../logger";
import { defaultDockerComposeOptions } from "./default-docker-compose-options";

export const dockerComposeDown = async (
  filePath: string,
  files: string | string[],
  projectName: string
): Promise<void> => {
  const createOptions = (): dockerCompose.IDockerComposeOptions => ({
    ...defaultDockerComposeOptions(filePath, files, projectName),
    commandOptions: ["-v"],
  });

  log.info(`Downing DockerCompose environment`);
  try {
    await dockerCompose.down(createOptions());
    log.info(`Downed DockerCompose environment`);
  } catch ({ err }) {
    log.error(`Failed to down DockerCompose environment: ${err}`);
    throw new Error(err.trim());
  }
};
