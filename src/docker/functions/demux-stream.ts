import { PassThrough, Readable } from "stream";
import { log } from "../../logger";
import { dockerClient } from "../docker-client";

export const demuxStream = async (stream: Readable): Promise<Readable> => {
  try {
    const demuxedStream = new PassThrough({ autoDestroy: true, encoding: "utf-8" });
    const { dockerode } = await dockerClient();
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
};
