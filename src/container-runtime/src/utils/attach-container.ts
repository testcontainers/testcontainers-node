import { Readable } from "stream";
import Dockerode from "dockerode";
import { demuxStream } from "./demux-stream";
import { log } from "@testcontainers/logger";

export const attachContainer = async (dockerode: Dockerode, container: Dockerode.Container): Promise<Readable> => {
  try {
    const stream = (await container.attach({ stream: true, stdout: true, stderr: true })) as NodeJS.ReadableStream;
    return demuxStream(dockerode, stream as Readable);
  } catch (err) {
    log.error(`Failed to attach to container: ${err}`, { containerId: container.id });
    throw err;
  }
};
