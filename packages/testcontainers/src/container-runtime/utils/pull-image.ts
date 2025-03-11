import byline from "byline";
import Dockerode from "dockerode";
import { log, pullLog } from "../../common";
import { getAuthConfig } from "../auth/get-auth-config";
import { ImageName } from "../image-name";
import { imageExists } from "./image-exists";

export type PullImageOptions = {
  imageName: ImageName;
  force: boolean;
};

export const pullImage = async (
  dockerode: Dockerode,
  indexServerAddress: string,
  options: PullImageOptions
): Promise<void> => {
  try {
    if (!options.force && (await imageExists(dockerode, options.imageName))) {
      log.debug(`Not pulling image "${options.imageName}" as it already exists`);
      return;
    }

    log.info(`Pulling image "${options.imageName}"...`);
    const authconfig = await getAuthConfig(options.imageName.registry ?? indexServerAddress);
    const stream = await dockerode.pull(options.imageName.string, { authconfig });
    return new Promise<void>((resolve) => {
      byline(stream).on("data", (line) => {
        if (pullLog.enabled()) {
          pullLog.trace(line, { imageName: options.imageName.string });
        }
      });
      stream.on("end", resolve);
    });
  } catch (err) {
    log.error(`Failed to pull image "${options.imageName}": ${err}`);
    throw err;
  }
};
