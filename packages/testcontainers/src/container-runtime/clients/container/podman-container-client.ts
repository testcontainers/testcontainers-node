import { Container, ExecCreateOptions } from "dockerode";
import { ExecOptions, ExecResult, ExecVerboseResult } from "./types";
import byline from "byline";
import { DockerContainerClient } from "./docker-container-client";
import { execLog, log } from "../../../common";
import { PassThrough, Readable } from "stream";

export class PodmanContainerClient extends DockerContainerClient {
  override async exec(container: Container, command: string[], opts?: Partial<ExecOptions>): Promise<ExecResult> {
    const execOptions: ExecCreateOptions = {
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    };

    if (opts?.env !== undefined) {
      execOptions.Env = Object.entries(opts.env).map(([key, value]) => `${key}=${value}`);
    }
    if (opts?.workingDir !== undefined) {
      execOptions.WorkingDir = opts.workingDir;
    }
    if (opts?.user !== undefined) {
      execOptions.User = opts.user;
    }

    const chunks: string[] = [];
    try {
      if (opts?.log) {
        log.debug(`Execing container with command "${command.join(" ")}"...`, { containerId: container.id });
      }

      const exec = await container.exec(execOptions);
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
      const exitCode = inspectResult.ExitCode ?? -1;
      const output = chunks.join("");

      return { output, exitCode };
    } catch (err) {
      log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${chunks.join("")}`, {
        containerId: container.id,
      });
      throw err;
    }
  }

  override async execVerbose(
    container: Container,
    command: string[],
    opts?: Partial<ExecOptions>
  ): Promise<ExecVerboseResult> {
    const execOptions: ExecCreateOptions = {
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    };

    if (opts?.env !== undefined) {
      execOptions.Env = Object.entries(opts.env).map(([key, value]) => `${key}=${value}`);
    }
    if (opts?.workingDir !== undefined) {
      execOptions.WorkingDir = opts.workingDir;
    }
    if (opts?.user !== undefined) {
      execOptions.User = opts.user;
    }

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    try {
      if (opts?.log) {
        log.debug(`Execing container verbosely with command "${command.join(" ")}"...`, { containerId: container.id });
      }

      const exec = await container.exec(execOptions);
      const stream = await exec.start({ stdin: true, Detach: false, Tty: false });

      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();

      // Podman may use the same demuxing approach as Docker
      this.dockerode.modem.demuxStream(stream, stdoutStream, stderrStream);

      const processStream = (stream: Readable, chunks: string[]) => {
        stream.on("data", (chunk) => {
          chunks.push(chunk.toString());
          if (opts?.log && execLog.enabled()) {
            execLog.trace(chunk.toString(), { containerId: container.id });
          }
        });
      };

      processStream(stdoutStream, stdoutChunks);
      processStream(stderrStream, stderrChunks);

      await new Promise((res, rej) => {
        stream.on("end", res);
        stream.on("error", rej);
      });
      stream.destroy();

      const inspectResult = await exec.inspect();
      const exitCode = inspectResult.ExitCode ?? -1;

      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");

      if (opts?.log) {
        log.debug(`ExecVerbose completed with command "${command.join(" ")}"`, { containerId: container.id });
      }

      return { stdout, stderr, exitCode };
    } catch (err) {
      log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${stderrChunks.join("")}`, {
        containerId: container.id,
      });
      throw err;
    }
  }
}
