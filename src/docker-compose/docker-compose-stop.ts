import { log } from "../logger";
import * as dockerCompose from "docker-compose";
import { defaultDockerComposeOptions } from "./default-docker-compose-options";

export const dockerComposeStop = async (
  filePath: string,
  files: string | string[],
  projectName: string
): Promise<void> => {
  log.info(`Stopping DockerCompose environment`);
  try {
    await dockerCompose.stop(defaultDockerComposeOptions(filePath, files, projectName));
    log.info(`Stopped DockerCompose environment`);
  } catch ({ err }) {
    log.error(`Failed to stop DockerCompose environment: ${err}`);
    throw new Error(err.trim());
  }
};
