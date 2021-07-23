import { log } from "./logger";
import Dockerode from "dockerode";
import { DockerImageName } from "./docker-image-name";
import { PullStreamParser } from "./pull-stream-parser";
import { Command } from "./docker/types";
import { demuxStream } from "./docker/functions/demux-stream";
import { Readable } from "stream";

export const runInContainer = async (
  dockerode: Dockerode,
  image: string,
  command: Command[]
): Promise<string | undefined> => {
  try {
    const dockerImageName = DockerImageName.fromString(image);
    if (!(await isImageCached(dockerode, dockerImageName))) {
      log.debug(`Pulling image: ${dockerImageName.toString()}`);
      await pull(dockerode, dockerImageName);
    }
    const container = await dockerode.createContainer({ Image: image, Cmd: command });
    // @ts-ignore
    const stream = demuxStream((await container.attach({ stream: true, stdout: true, stderr: true })) as Readable);

    const promise = new Promise<string>((resolve) => {
      const chunks: string[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(chunks.join("").trim()));
    });

    await container.start();
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

const pull = async (dockerode: Dockerode, dockerImageName: DockerImageName): Promise<void> => {
  log.info(`Pulling image: ${dockerImageName}`);
  const stream = await dockerode.pull(dockerImageName.toString());
  await new PullStreamParser(dockerImageName, log).consume(stream);
};

const isImageCached = async (dockerode: Dockerode, imageName: DockerImageName): Promise<boolean> => {
  const dockerImageNames = await fetchDockerImageNames(dockerode);
  return dockerImageNames.some((dockerImageName) => dockerImageName.equals(imageName));
};

const fetchDockerImageNames = async (dockerode: Dockerode): Promise<DockerImageName[]> => {
  const images = await dockerode.listImages();

  return images.reduce((dockerImageNames: DockerImageName[], image) => {
    if (isDanglingImage(image)) {
      return dockerImageNames;
    }
    const dockerImageNamesForImage = image.RepoTags.map((imageRepoTag) => DockerImageName.fromString(imageRepoTag));
    return [...dockerImageNames, ...dockerImageNamesForImage];
  }, []);
};

const isDanglingImage = (image: Dockerode.ImageInfo) => {
  return image.RepoTags === null;
};
