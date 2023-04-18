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

const MAX_ATTEMPTS = 2;
const imagePullLock = new AsyncLock();

export const pullImage = async (
  dockerode: Dockerode,
  indexServerAddress: string,
  options: PullImageOptions
): Promise<void> => {
  const doPullImage = async (attempt: number) => {
    log.info(`Pulling image (attempt ${attempt}): ${options.imageName}`);
    const authconfig = await getAuthConfig(options.imageName.registry ?? indexServerAddress);
    const stream = await dockerode.pull(options.imageName.toString(), { authconfig });
    await new PullStreamParser(options.imageName, log).consume(stream);
  };

  try {
    return await imagePullLock.acquire(options.imageName.toString(), async () => {
      if (!options.force && (await imageExists(dockerode, options.imageName))) {
        log.debug(`Not pulling image as it already exists: ${options.imageName}`);
        return;
      }

      let currentAttempts = 0;
      do {
        if (currentAttempts === MAX_ATTEMPTS) throw new Error(`Failed to pull image after ${MAX_ATTEMPTS} attempts`);
        await doPullImage(++currentAttempts);
      } while (!(await imageExists(dockerode, options.imageName)));
    });
  } catch (err) {
    log.error(`Failed to pull image "${options.imageName}": ${err}`);
    throw err;
  }
};
