import { log } from "../../logger";
import { defaultDockerComposeOptions } from "../default-docker-compose-options";
import { DockerComposeOptions } from "../docker-compose-options";
import { down } from "../docker-compose";
import { DockerComposeDownOptions } from "../../test-container";

export const dockerComposeDown = async (
  options: DockerComposeOptions,
  downOptions: DockerComposeDownOptions
): Promise<void> => {
  log.info(`Downing DockerCompose environment`);

  try {
    await down({ ...defaultDockerComposeOptions(options), commandOptions: commandOptions(downOptions) });
    log.info(`Downed DockerCompose environment`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
