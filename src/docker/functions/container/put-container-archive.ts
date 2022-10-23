import { Readable } from "stream";
import Dockerode from "dockerode";
import { log } from "../../../logger.js";

export type PutContainerArchiveOptions = {
  container: Dockerode.Container;
  stream: Readable;
  containerPath: string;
};

export const putContainerArchive = async (options: PutContainerArchiveOptions): Promise<void> => {
  try {
    await options.container.putArchive(options.stream, { path: options.containerPath });
  } catch (err) {
    log.error(`Failed to put archive to container ${options.container.id}: ${err}`);
    throw err;
  }
};
