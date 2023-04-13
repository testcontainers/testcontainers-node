import { log } from "../../logger";
import { pullAll, pullMany } from "docker-compose";
import { defaultDockerComposeOptions } from "../default-docker-compose-options";
import { DockerComposeOptions } from "../docker-compose-options";

export const dockerComposePull = async (options: DockerComposeOptions, services?: Array<string>): Promise<void> => {
  try {
    if (services) {
      log.info(`Pulling DockerCompose environment images for ${services.join(", ")}`);
      await pullMany(services, await defaultDockerComposeOptions(options));
    } else {
      log.info(`Pulling DockerCompose environment images`);
      await pullAll(await defaultDockerComposeOptions(options));
    }
    log.info(`Pulled DockerCompose environment`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const errorMessage = err.err || err.message || err || "";
    log.error(`Failed to pull DockerCompose environment images: ${errorMessage.trim()}`);
    throw new Error(errorMessage);
  }
};
