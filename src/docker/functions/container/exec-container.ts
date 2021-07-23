import { Duplex, Readable } from "stream";
import { Command, ExecResult, ExitCode } from "../../types";
import Dockerode from "dockerode";
import { log } from "../../../logger";

export const execContainer = async (container: Dockerode.Container, command: Command[]): Promise<ExecResult> => {
  try {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await startExec(exec);

    return await new Promise((resolve) => {
      const chunks: string[] = [];

      stream.on("data", (chunk) => chunks.push(chunk));

      const interval = setInterval(async () => {
        const { running, exitCode } = await inspectExec(exec);

        if (!running) {
          clearInterval(interval);
          stream.destroy();
          resolve({ output: chunks.join(""), exitCode });
        }
      }, 100);
    });
  } catch (err) {
    log.error(`Failed to exec container ${container.id} with command "${command.join(" ")}": ${err}`);
    throw err;
  }
};

const startExec = async (exec: Dockerode.Exec): Promise<Readable> => {
  const options = {
    Detach: false,
    Tty: true,
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
  };

  return new Promise((resolve, reject) => {
    exec.start(options, (err?: Error, stream?: Duplex) => {
      if (err) {
        return reject(err);
      } else if (!stream) {
        return reject(new Error("Unexpected error occurred, stream is undefined"));
      }
      stream.setEncoding("utf-8");
      return resolve(stream);
    });
  });
};

type ExecInspectResult = {
  exitCode: ExitCode;
  running: boolean;
  entrypoint: string;
  arguments: string[];
};

const inspectExec = async (exec: Dockerode.Exec): Promise<ExecInspectResult> => {
  const inspectResult = await exec.inspect();

  return {
    exitCode: inspectResult.ExitCode === null ? -1 : inspectResult.ExitCode,
    running: inspectResult.Running,
    entrypoint: inspectResult.ProcessConfig.entrypoint,
    arguments: inspectResult.ProcessConfig.arguments,
  };
};
