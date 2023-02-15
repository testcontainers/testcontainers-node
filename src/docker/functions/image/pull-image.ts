import { DockerImageName } from "../../../docker-image-name";
import { log } from "../../../logger";
import { PullStreamParser } from "../../pull-stream-parser";
import { imageExists } from "./image-exists";
import Dockerode from "dockerode";
import { getAuthConfig } from "../../../registry-auth-locator";

export type PullImageOptions = {
  imageName: DockerImageName;
  force: boolean;
};

export const pullImage = async (dockerode: Dockerode, options: PullImageOptions): Promise<void> => {
  try {
    if ((await imageExists(dockerode, options.imageName)) && !options.force) {
      log.debug(`Not pulling image as it already exists: ${options.imageName}`);
      return;
    }

    log.info(`Pulling image: ${options.imageName}`);
    const authconfig = await getAuthConfig(options.imageName.registry);
    const stream = await dockerode.pull(options.imageName.toString(), { authconfig });

    await new PullStreamParser(options.imageName, log).consume(stream);
  } catch (err) {
    log.error(`Failed to pull image "${options.imageName}": ${err}`);
    throw err;
  }
};
