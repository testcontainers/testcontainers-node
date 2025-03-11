import Dockerode from "dockerode";
import { log, streamToString } from "../../common";
import { ImageName } from "../image-name";
import { attachContainer } from "./attach-container";
import { pullImage } from "./pull-image";
import { startContainer } from "./start-container";

export const runInContainer = async (
  dockerode: Dockerode,
  indexServerAddress: string,
  image: string,
  command: string[]
): Promise<string | undefined> => {
  try {
    await pullImage(dockerode, indexServerAddress, { imageName: ImageName.fromString(image), force: false });

    log.debug(`Creating container: ${image} with command "${command.join(" ")}"...`);
    const container = await dockerode.createContainer({ Image: image, Cmd: command });

    log.debug(`Attaching to container...`, { containerId: container.id });
    const stream = await attachContainer(dockerode, container);

    log.debug(`Starting container...`, { containerId: container.id });
    await startContainer(container);

    log.debug(`Waiting for container output...`, { containerId: container.id });
    const output = await streamToString(stream, { trim: true });

    log.debug(`Removing container...`, { containerId: container.id });
    await container.remove({ force: true, v: true });

    return output.length === 0 ? undefined : output;
  } catch (err) {
    log.error(`Failed to run command "${command.join(" ")}" in container: "${err}"`);
    return undefined;
  }
};
