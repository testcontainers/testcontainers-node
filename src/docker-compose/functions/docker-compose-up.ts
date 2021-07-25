import { log } from "../../logger";
import { upAll } from "docker-compose";
import { defaultDockerComposeOptions } from "../default-docker-compose-options";
import { DockerComposeOptions } from "../docker-compose-options";
import { dockerComposeDown } from "./docker-compose-down";

export const dockerComposeUp = async (options: DockerComposeOptions): Promise<void> => {
  log.info(`Upping DockerCompose environment`);

  try {
    await upAll(defaultDockerComposeOptions(options));
    log.info(`Upped DockerCompose environment`);
  } catch (err) {
    log.error(`Failed to up DockerCompose environment: ${err}`);

    try {
      await dockerComposeDown(options);
    } catch {
      log.warn(`Failed to down DockerCompose environment after failed up`);
    }

    throw new Error(err);
  }
};
