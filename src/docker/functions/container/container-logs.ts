import { IncomingMessage } from "http";
import { log } from "../../../logger";
import Dockerode from "dockerode";
import { demuxStream } from "../demux-stream";
import { Readable } from "stream";
import { dockerClient } from "../../docker-client";
import { InspectResult } from "./inspect-container";

export const containerLogs = async (
  container: Dockerode.Container,
  inspectResult: InspectResult
): Promise<Readable> => {
  try {
    const opts = hasContainerRestarted(inspectResult) ? logOptionsForRestartedContainer(inspectResult) : undefined;
    const stream = (await container.logs({ follow: true, stdout: true, stderr: true, ...opts })) as IncomingMessage;
    stream.socket.unref();
    return demuxStream((await dockerClient()).dockerode, stream);
  } catch (err) {
    log.error(`Failed to get container logs: ${err}`);
    throw err;
  }
};

const hasContainerRestarted = ({ state: { finishedAt, status } }: InspectResult) =>
  finishedAt !== undefined && status === "running";

const logOptionsForRestartedContainer = (
  inspectResult: InspectResult
): Omit<Dockerode.ContainerLogsOptions, "follow" | "stdout" | "stderr"> | undefined => {
  const { finishedAt } = inspectResult.state;
  if (finishedAt === undefined) {
    return undefined;
  }

  return {
    since: finishedAt.getTime() / 1000,
    timestamps: true,
  };
};
