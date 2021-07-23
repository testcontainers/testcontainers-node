import { Readable } from "stream";
import Dockerode from "dockerode";

export type PutContainerArchiveOptions = {
  container: Dockerode.Container;
  stream: Readable;
  containerPath: string;
};

export const putContainerArchive = async (options: PutContainerArchiveOptions): Promise<void> => {
  try {
    await options.container.putArchive(options.stream, { path: options.containerPath });
  } catch (err) {
    throw err;
  }
};
