import { DockerImageName } from "../../../docker-image-name";
import { log } from "../../../logger";
import { PullStreamParser } from "../../pull-stream-parser";
import { imageExists } from "./image-exists";
import Dockerode from "dockerode";
import { getAuthConfig } from "../../../registry-auth-locator/get-auth-config";
import AsyncLock from "async-lock";

export type PullImageOptions = {
  imageName: DockerImageName;
  force: boolean;
};

const imagePullLock = new AsyncLock();

export const pullImage = async (
  dockerode: Dockerode,
  indexServerAddress: string,
  options: PullImageOptions
): Promise<void> => {
  try {
    return imagePullLock.acquire(options.imageName.toString(), async () => {
      if (!options.force && (await imageExists(dockerode, options.imageName))) {
        log.debug(`Not pulling image as it already exists: ${options.imageName}`);
        return;
      }

      log.info(`Pulling image: ${options.imageName}`);
      const authconfig = await getAuthConfig(options.imageName.registry ?? indexServerAddress);
      const stream = await dockerode.pull(options.imageName.toString(), { authconfig });

      await new PullStreamParser(options.imageName, log).consume(stream);
    });
  } catch (err) {
    log.error(`Failed to pull image "${options.imageName}": ${err}`);
    throw err;
  }
};
