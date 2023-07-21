// import { Readable } from "stream";
// import { ContainerRuntime, ExecResult } from "../../types";
// import Dockerode from "dockerode";
// import { execLog, log } from "@testcontainers/logger";
// import byline from "byline";
// import { demuxStream } from "../demux-stream";
//
// export const execContainer = async (
//   dockerode: Dockerode,
//   containerRuntime: ContainerRuntime,
//   container: Dockerode.Container,
//   command: string[],
//   shouldLog = true
// ): Promise<ExecResult> => {
//   const chunks: string[] = [];
//
//   try {
//     const exec = await container.exec({
//       Cmd: command,
//       AttachStdout: true,
//       AttachStderr: true,
//     });
//
//     const stream = await startExec(dockerode, containerRuntime, exec, container);
//
//     stream.on("data", (chunk) => chunks.push(chunk));
//
//     if (shouldLog && execLog.enabled()) {
//       byline(stream).on("data", (line) => execLog.trace(line, { containerId: container.id }));
//     }
//
//     const exitCode = await waitForExec(exec, stream);
//     stream.destroy();
//
//     return { output: chunks.join(""), exitCode };
//   } catch (err) {
//     log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${chunks.join("")}`, {
//       containerId: container.id,
//     });
//     throw err;
//   }
// };
//
// const startExec = async (
//   dockerode: Dockerode,
//   containerRuntime: ContainerRuntime,
//   exec: Dockerode.Exec,
//   container: Dockerode.Container
// ): Promise<Readable> => {
//   try {
//     const stream = await exec.start({ stdin: true, Detach: false, Tty: true });
//     if (containerRuntime === "podman") {
//       return demuxStream(dockerode, stream);
//     } else {
//       return stream;
//     }
//   } catch (err) {
//     log.error(`Failed to start exec: ${err}`, { containerId: container.id });
//     throw err;
//   }
// };
//
// const waitForExec = async (exec: Dockerode.Exec, stream: Readable): Promise<number> => {
//   await new Promise((res, rej) => {
//     stream.on("end", res);
//     stream.on("error", rej);
//   });
//
//   const inspectResult = await exec.inspect();
//   return inspectResult.ExitCode === null ? -1 : inspectResult.ExitCode;
// };
