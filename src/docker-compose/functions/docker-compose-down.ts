import { log } from "../../logger.js";
import { defaultDockerComposeOptions } from "../default-docker-compose-options.js";
import { DockerComposeOptions } from "../docker-compose-options.js";
import { down } from "../docker-compose.js";
import { DockerComposeDownOptions } from "../../test-container.js";

export const dockerComposeDown = async (
  options: DockerComposeOptions,
  downOptions: DockerComposeDownOptions
): Promise<void> => {
  log.info(`Downing DockerCompose environment`);

  try {
    await down({ ...defaultDockerComposeOptions(options), commandOptions: commandOptions(downOptions) });
    log.info(`Downed DockerCompose environment`);
  } catch (err: any) {
    const errorMessage = err.err || err.message || err;
    log.error(`Failed to down DockerCompose environment: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};

const commandOptions = (options: DockerComposeDownOptions): string[] => {
  const result: string[] = [];
  if (options.removeVolumes) {
    result.push("-v");
  }
  if (options.timeout) {
    result.push("-t", `${options.timeout / 1000}`);
  }
  return result;
};
