import { Readable } from "stream";
import { ExecResult } from "../../types";
import Dockerode from "dockerode";
import { execLog, log } from "../../../logger";
import byline from "byline";
import { demuxStream } from "../demux-stream";
import { Provider } from "../../docker-client";

export const execContainer = async (
  dockerode: Dockerode,
  provider: Provider,
  container: Dockerode.Container,
  command: string[],
  shouldLog = true
): Promise<ExecResult> => {
  const chunks: string[] = [];

  try {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await startExec(dockerode, provider, exec);

    stream.on("data", (chunk) => chunks.push(chunk));

    if (shouldLog && execLog.enabled()) {
      byline(stream).on("data", (line) => execLog.trace(`${container.id}: ${line}`));
    }

    const exitCode = await waitForExec(exec, stream);
    stream.destroy();

    return { output: chunks.join(""), exitCode };
  } catch (err) {
    log.error(
      `Failed to exec container ${container.id} with command "${command.join(
        " "
      )}": ${err}. Container output: ${chunks.join("")}`
    );
    throw err;
  }
};

const startExec = async (dockerode: Dockerode, provider: Provider, exec: Dockerode.Exec): Promise<Readable> => {
  try {
    const stream = await exec.start({ stdin: true, Detach: false, Tty: true });
    if (provider === "podman") {
      return demuxStream(dockerode, stream);
    } else {
      return stream;
    }
  } catch (err) {
    log.error(`Failed to start exec: ${err}`);
    throw err;
  }
};

const waitForExec = async (exec: Dockerode.Exec, stream: Readable): Promise<number> => {
  await new Promise((res, rej) => {
    stream.on("end", res);
    stream.on("error", rej);
  });

  const inspectResult = await exec.inspect();
  return inspectResult.ExitCode === null ? -1 : inspectResult.ExitCode;
};
