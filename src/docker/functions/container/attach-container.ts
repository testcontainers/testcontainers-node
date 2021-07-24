import { Readable } from "stream";
import Dockerode from "dockerode";
import { demuxStream } from "../demux-stream";
import { log } from "../../../logger";

export const attachContainer = async (container: Dockerode.Container): Promise<Readable> => {
  try {
    const stream = (await container.attach({ stream: true, stdout: true, stderr: true })) as NodeJS.ReadableStream;
    return demuxStream(stream as Readable);
  } catch (err) {
    log.error(`Failed to attach to container ${container.id}: ${err}`);
    throw err;
  }
};
