import { Command } from "./docker-client";
import { log } from "./logger";
import Dockerode from "dockerode";

export const runInContainer = async (
  dockerode: Dockerode,
  image: string,
  command: Command[]
): Promise<string | undefined> => {
  try {
    const container = await dockerode.createContainer({ Image: image, Cmd: command });
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });

    const chunks: string[] = [];
    const promise = new Promise<void>((resolve) => {
      stream.on("end", () => resolve());

      const outStream = {
        write: (chunk: string) => {
          const chunkStr = Buffer.from(chunk).toString().trim();
          chunks.push(chunkStr);
        },
      };

      const errStream = {
        write: (chunk: string) => {
          const chunkStr = Buffer.from(chunk).toString().trim();
          log.warn(`Unexpected STDERR when running command in container: ${chunkStr}`);
          resolve(undefined);
        },
      };

      container.modem.demuxStream(stream, outStream, errStream);
    });

    await container.start();
    await promise;

    if (chunks.length === 0) {
      return undefined;
    } else {
      return chunks.join("");
    }
  } catch (err) {
    log.error(`Failed to run command in container: "${command.join(" ")}", error: "${err}"`);
    return undefined;
  }
};
