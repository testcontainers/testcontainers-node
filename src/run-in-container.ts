import { Command } from "./docker-client";
import { log } from "./logger";
import Dockerode from "dockerode";
import { PassThrough } from "stream";

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

      const out = new PassThrough({ encoding: "utf-8" }).on("data", (chunk) => chunks.push(chunk));
      const err = new PassThrough({ encoding: "utf-8" }).on("data", () => resolve(undefined));

      container.modem.demuxStream(stream, out, err);
    });

    await container.start();
    await promise;

    if (chunks.length === 0) {
      return undefined;
    } else {
      return chunks.join("").trim();
    }
  } catch (err) {
    log.error(`Failed to run command in container: "${command.join(" ")}", error: "${err}"`);
    return undefined;
  }
};
