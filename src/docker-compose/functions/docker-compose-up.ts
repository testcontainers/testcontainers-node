import { log } from "../../logger";
import { upAll, upMany } from "docker-compose";
import { defaultDockerComposeOptions } from "../default-docker-compose-options";
import { DockerComposeOptions } from "../docker-compose-options";
import { dockerComposeDown } from "./docker-compose-down";

export const dockerComposeUp = async (options: DockerComposeOptions, services?: Array<string>): Promise<void> => {
  log.info(`Upping DockerCompose environment`);

  try {
    if (services) {
      await upMany(services, defaultDockerComposeOptions(options));
    } else {
      await upAll(defaultDockerComposeOptions(options));
    }
    log.info(`Upped DockerCompose environment`);
  } catch (err: any) {
    const errorMessage = err.err || err.message || err;
    log.error(`Failed to up DockerCompose environment: ${errorMessage}`);

    try {
      await dockerComposeDown(options, { removeVolumes: true, timeout: 0 });
    } catch {
      log.warn(`Failed to down DockerCompose environment after failed up`);
    }

    throw new Error(errorMessage);
  }
};
