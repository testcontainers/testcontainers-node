import { log } from "../../logger";
import { stop } from "../docker-compose";
import { defaultDockerComposeOptions } from "../default-docker-compose-options";
import { DockerComposeOptions } from "../docker-compose-options";

export const dockerComposeStop = async (options: DockerComposeOptions): Promise<void> => {
  log.info(`Stopping DockerCompose environment`);

  try {
    await stop(defaultDockerComposeOptions(options));
    log.info(`Stopped DockerCompose environment`);
  } catch (err) {
    const errorMessage = err.err || err.message || err;
    log.error(`Failed to stop DockerCompose environment: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};
