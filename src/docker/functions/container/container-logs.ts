import { IncomingMessage } from "http";
import { log } from "../../../logger";
import Dockerode from "dockerode";
import { demuxStream } from "../demux-stream";
import { Readable } from "stream";
import { dockerClient } from "../../docker-client";

export const containerLogs = async (container: Dockerode.Container): Promise<Readable> => {
  try {
    const options = {
      follow: true,
      stdout: true,
      stderr: true,
    };
    const stream = (await container.logs(options)) as IncomingMessage;

    stream.socket.unref();

    return demuxStream((await dockerClient()).dockerode, stream);
  } catch (err) {
    log.error(`Failed to get container logs: ${err}`);
    throw err;
  }
};
