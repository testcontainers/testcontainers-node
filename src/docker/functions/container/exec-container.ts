import { Readable } from "stream";
import { Command, ExecResult, ExitCode } from "../../types";
import Dockerode from "dockerode";
import { log, execLog } from "../../../logger";
import byline from "byline";

type ExecContainerOptions = {
  tty: boolean;
  stdin: boolean;
  detach: boolean;
};

export const execContainer = async (
  container: Dockerode.Container,
  command: Command[],
  options: ExecContainerOptions,
  shouldLog = true
): Promise<ExecResult> => {
  const chunks: string[] = [];

  try {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await startExec(exec, options);

    stream.on("data", (chunk) => chunks.push(chunk));

    if (shouldLog) {
      byline(stream).on("data", (line) => execLog.trace(`${container.id}: ${line}`));
    }

    const exitCode = await waitForExec(exec);

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

const startExec = async (exec: Dockerode.Exec, options: ExecContainerOptions): Promise<Readable> => {
  try {
    const stream = await exec.start(options);
    stream.setEncoding("utf-8");
    return stream;
  } catch (err) {
    log.error(`Failed to start exec: ${err}`);
    throw err;
  }
};

type ExecInspectResult = {
  exitCode: ExitCode;
  running: boolean;
  entrypoint: string;
  arguments: string[];
};

const inspectExec = async (exec: Dockerode.Exec): Promise<ExecInspectResult> => {
  try {
    const inspectResult = await exec.inspect();

    return {
      exitCode: inspectResult.ExitCode === null ? -1 : inspectResult.ExitCode,
      running: inspectResult.Running,
      entrypoint: inspectResult.ProcessConfig.entrypoint,
      arguments: inspectResult.ProcessConfig.arguments,
    };
  } catch (err) {
    log.error(`Failed to inspect exec: ${err}`);
    throw err;
  }
};

const waitForExec = async (exec: Dockerode.Exec): Promise<number> =>
  new Promise((resolve) => {
    const interval = setInterval(async () => {
      const { running, exitCode } = await inspectExec(exec);

      if (!running) {
        clearInterval(interval);
        resolve(exitCode);
      }
    }, 100);
  });
