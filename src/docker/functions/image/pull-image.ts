import { DockerImageName } from "../../../docker-image-name";
import { log } from "../../../logger";
import { PullStreamParser } from "../../../pull-stream-parser";
import { dockerode } from "../../dockerode";
import { AuthConfig } from "../../types";
import { imageExists } from "./image-exists";

// todo rename DockerImageName => ImageName or Image

export type PullImageOptions = {
  imageName: DockerImageName;
  force: boolean;
  authConfig: AuthConfig | undefined;
};

export const pullImage = async (options: PullImageOptions): Promise<void> => {
  if ((await imageExists(options.imageName)) && !options.force) {
    log.debug(`Not pulling image as it already exists: ${options.imageName}`);
    return;
  }

  log.info(`Pulling image: ${options.imageName}`);
  const stream = await dockerode.pull(options.imageName.toString(), { authconfig: options.authConfig });

  await new PullStreamParser(options.imageName, log).consume(stream);
};
