import { down } from "docker-compose";
import { log } from "../../logger";
import { defaultDockerComposeOptions } from "../default-docker-compose-options";
import { DockerComposeOptions } from "../docker-compose-options";

export const dockerComposeDown = async (options: DockerComposeOptions): Promise<void> => {
  log.info(`Downing DockerCompose environment`);

  try {
    await down({ ...defaultDockerComposeOptions(options), commandOptions: ["-v"] });
    log.info(`Downed DockerCompose environment`);
  } catch (err) {
    log.error(`Failed to down DockerCompose environment: ${err}`);
    throw new Error(err);
  }
};
