import { log } from "../../logger";
import { DockerImageName } from "../../docker-image-name";
import { pullImage } from "./image/pull-image";
import { startContainer } from "./container/start-container";
import { attachContainer } from "./container/attach-container";
import { inspectContainer } from "./container/inspect-container";
import Dockerode from "dockerode";

export const runInContainer = async (
  dockerode: Dockerode,
  indexServerAddress: string,
  image: string,
  command: string[]
): Promise<string | undefined> => {
  try {
    const imageName = DockerImageName.fromString(image);

    await pullImage(dockerode, indexServerAddress, { imageName, force: false });

    log.debug(`Creating container: ${image} with command: ${command.join(" ")}`);
    const container = await dockerode.createContainer({ Image: image, Cmd: command, HostConfig: { AutoRemove: true } });
    log.debug(`Attaching to container: ${container.id}`);
    const stream = await attachContainer(dockerode, container);

    const promise = new Promise<string>((resolve) => {
      const interval = setInterval(async () => {
        const inspect = await inspectContainer(container);

        if (inspect.state.status === "exited") {
          clearInterval(interval);
          stream.destroy();
        }
      }, 100);

      const chunks: string[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        clearInterval(interval);
        resolve(chunks.join("").trim());
      });
    });

    log.debug(`Starting container: ${container.id}`);
    await startContainer(container);
    log.debug(`Waiting for container output: ${container.id}`);
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
