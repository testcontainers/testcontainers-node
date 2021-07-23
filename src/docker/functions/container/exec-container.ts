import { Container } from "../../../container";
import { Readable } from "stream";
import { Command, ExecResult } from "../../../docker-client";

export const execContainer = async (container: Container, command: Command[]): Promise<ExecResult> => {
  const exec = await container.exec({
    cmd: command,
    attachStdout: true,
    attachStderr: true,
  });

  const stream = (await exec.start()).setEncoding("utf-8") as Readable;

  return await new Promise((resolve) => {
    let output = "";
    stream.on("data", (chunk) => (output += chunk));

    const interval = setInterval(async () => {
      const { running, exitCode } = await exec.inspect();

      if (!running) {
        clearInterval(interval);
        stream.destroy();
        resolve({ output, exitCode });
      }
    }, 100);
  });
};
