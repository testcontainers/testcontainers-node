import { log } from "../logger";
import { DockerImageName } from "../docker-image-name";
import { Command } from "./types";
import { dockerode } from "./dockerode";
import { pullImage } from "./functions/image/pull-image";
import { startContainer } from "./functions/container/start-container";
import { attachContainer } from "./functions/container/attach-container";

export const runInContainer = async (image: string, command: Command[]): Promise<string | undefined> => {
  try {
    const imageName = DockerImageName.fromString(image);

    await pullImage({ imageName, force: false });

    const container = await dockerode.createContainer({ Image: image, Cmd: command });
    const stream = await attachContainer(container);

    const promise = new Promise<string>((resolve) => {
      const chunks: string[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(chunks.join("").trim()));
    });

    await startContainer(container);
    const output = await promise;

    if (output.length === 0) {
      return undefined;
    } else {
      return output;
    }
  } catch (err) {
    log.error(`Failed to run command in container: "${command.join(" ")}", error: "${err}"`);
    return undefined;
  }
};
