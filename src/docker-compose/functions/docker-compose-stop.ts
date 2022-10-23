import { log } from "../../logger.js";
import { stop } from "../docker-compose.js";
import { defaultDockerComposeOptions } from "../default-docker-compose-options.js";
import { DockerComposeOptions } from "../docker-compose-options.js";

export const dockerComposeStop = async (options: DockerComposeOptions): Promise<void> => {
  log.info(`Stopping DockerCompose environment`);

  try {
    await stop(defaultDockerComposeOptions(options));
    log.info(`Stopped DockerCompose environment`);
  } catch (err: any) {
    const errorMessage = err.err || err.message || err;
    log.error(`Failed to stop DockerCompose environment: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};
