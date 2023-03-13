import { log } from "../../logger";
import { DockerImageName } from "../../docker-image-name";
import { pullImage } from "./image/pull-image";
import { startContainer } from "./container/start-container";
import { attachContainer } from "./container/attach-container";
import Dockerode from "dockerode";
import { streamToString } from "../../stream-utils";

export const runInContainer = async (
  dockerode: Dockerode,
  indexServerAddress: string,
  image: string,
  command: string[]
): Promise<string | undefined> => {
  try {
    await pullImage(dockerode, indexServerAddress, { imageName: DockerImageName.fromString(image), force: false });

    log.debug(`Creating container: ${image} with command: ${command.join(" ")}`);
    const container = await dockerode.createContainer({ Image: image, Cmd: command });

    log.debug(`Attaching to container: ${container.id}`);
    const stream = await attachContainer(dockerode, container);

    log.debug(`Starting container: ${container.id}`);
    await startContainer(container);

    log.debug(`Waiting for container output: ${container.id}`);
    const output = await streamToString(stream, { trim: true });

    log.debug(`Removing container: ${container.id}`);
    await container.remove({ force: true, v: true });

    return output.length === 0 ? undefined : output;
  } catch (err) {
    log.error(`Failed to run command in container: "${command.join(" ")}", error: "${err}"`);
    return undefined;
  }
};
