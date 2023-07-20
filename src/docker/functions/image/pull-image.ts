import { DockerImageName } from "../../../docker-image-name";
import { log, pullLog } from "@testcontainers/logger";
import { imageExists } from "./image-exists";
import Dockerode from "dockerode";
import { getAuthConfig } from "../../../registry-auth-locator/get-auth-config";
import AsyncLock from "async-lock";
import byline from "byline";

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
        log.debug(`Not pulling image "${options.imageName}" as it already exists`);
        return;
      }

      log.info(`Pulling image "${options.imageName}"...`);
      const authconfig = await getAuthConfig(options.imageName.registry ?? indexServerAddress);
      const stream = await dockerode.pull(options.imageName.toString(), { authconfig });
      return new Promise<void>((resolve) => {
        byline(stream).on("data", (line) => {
          if (pullLog.enabled()) {
            pullLog.trace(line, { imageName: options.imageName.toString() });
          }
        });
        stream.on("end", resolve);
      });
    });
  } catch (err) {
    log.error(`Failed to pull image "${options.imageName}": ${err}`);
    throw err;
  }
};
