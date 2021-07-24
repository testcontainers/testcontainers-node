import { Readable } from "stream";
import Dockerode from "dockerode";
import { demuxStream } from "../demux-stream";
import { log } from "../../../logger";

export const attachContainer = async (container: Dockerode.Container): Promise<Readable> => {
  try {
    const muxedReadWriteStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const muxedReadableStream = new Readable().wrap(muxedReadWriteStream);

    return demuxStream(muxedReadableStream);
  } catch (err) {
    log.error(`Failed to attach to container ${container.id}: ${err}`);
    throw err;
  }
};
