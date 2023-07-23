import { Container } from "dockerode";
import { ExecResult } from "./types";
import { execLog } from "../../logger";
import byline from "byline";
import { DockerContainerClient } from "./docker-container-client";
import { log } from "@testcontainers/common";

export class PodmanContainerClient extends DockerContainerClient {
  override async exec(container: Container, command: string[], opts?: { log: boolean }): Promise<ExecResult> {
    const chunks: string[] = [];

    try {
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await this.demuxStream(container.id, await exec.start({ stdin: true, Detach: false, Tty: true }));
      if (opts?.log && execLog.enabled()) {
        byline(stream).on("data", (line) => execLog.trace(line, { containerId: container.id }));
      }

      await new Promise((res, rej) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", res);
        stream.on("error", rej);
      });
      stream.destroy();

      const inspectResult = await exec.inspect();
      const exitCode = inspectResult.ExitCode === null ? -1 : inspectResult.ExitCode;
      const output = chunks.join("");

      return { output, exitCode };
    } catch (err) {
      log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${chunks.join("")}`, {
        containerId: container.id,
      });
      throw err;
    }
  }
}
