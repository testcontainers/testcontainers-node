import { Readable } from "stream";
import Dockerode from "dockerode";
import { log } from "../../../logger";
import { streamToString } from "../../../stream-utils";

export type PutContainerArchiveOptions = {
  container: Dockerode.Container;
  stream: Readable;
  containerPath: string;
};

export const putContainerArchive = async (options: PutContainerArchiveOptions): Promise<void> => {
  try {
    const stream = await options.container.putArchive(options.stream, { path: options.containerPath });
    await streamToString(Readable.from(stream));
  } catch (err) {
    log.error(`Failed to put archive to container: ${err}`, { containerId: options.container.id });
    throw err;
  }
};
