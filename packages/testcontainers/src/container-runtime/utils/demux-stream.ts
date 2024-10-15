import { PassThrough, Readable } from "node:stream";
import Dockerode from "dockerode";
import { log } from "../../common/index.ts";

export async function demuxStream(dockerode: Dockerode, stream: Readable): Promise<Readable> {
  try {
    const demuxedStream = new PassThrough({ autoDestroy: true, encoding: "utf-8" });
    dockerode.modem.demuxStream(stream, demuxedStream, demuxedStream);
    stream.on("end", () => demuxedStream.end());
    demuxedStream.on("close", () => {
      if (!stream.destroyed) {
        stream.destroy();
      }
    });
    return demuxedStream;
  } catch (err) {
    log.error(`Failed to demux stream: ${err}`);
    throw err;
  }
}
