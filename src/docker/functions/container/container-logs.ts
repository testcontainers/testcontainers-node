import { IncomingMessage } from "http";
import { log } from "../../../logger";
import Dockerode from "dockerode";
import { demuxStream } from "../demux-stream";
import { Readable } from "stream";
import { dockerClient } from "../../docker-client";

export type ContainerLogsOptions = {
  since?: Date;
};

export const containerLogs = async (
  container: Dockerode.Container,
  options: ContainerLogsOptions = {}
): Promise<Readable> => {
  try {
    const stream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      since: options.since ? options.since.getTime() / 1000 : 0,
    })) as IncomingMessage;
    stream.socket.unref();
    return demuxStream((await dockerClient()).dockerode, stream);
  } catch (err) {
    log.error(`Failed to get container logs: ${err}`);
    throw err;
  }
};
