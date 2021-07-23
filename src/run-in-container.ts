import {Command, DockerClient} from "./docker-client";
import { log } from "./logger";
import Dockerode from "dockerode";
import { PassThrough } from "stream";
import {DockerImageName} from "./docker-image-name";
import {PullStreamParser} from "./pull-stream-parser";

export const runInContainer = async (
  dockerode: Dockerode,
  image: string,
  command: Command[]
): Promise<string | undefined> => {
  try {
    const dockerImageName = DockerImageName.fromString(image);
    if (!await isImageCached(dockerode, dockerImageName)) {
      log.debug(`Pulling image: ${dockerImageName.toString()}`);
      await pull(dockerode, dockerImageName);
    }
    const container = await dockerode.createContainer({ Image: image, Cmd: command });
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });

    const chunks: string[] = [];

    const promise = new Promise<void>((resolve) => {
      stream.on("end", () => resolve());

      const out = new PassThrough({ autoDestroy: true, encoding: "utf-8" }).on("data", (chunk) => chunks.push(chunk));
      const err = new PassThrough({ autoDestroy: true, encoding: "utf-8" }).on("data", () => resolve(undefined));

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

const pull = async (dockerode: Dockerode, dockerImageName: DockerImageName): Promise<void> => {
  log.info(`Pulling image: ${dockerImageName}`);
  const stream = await dockerode.pull(dockerImageName.toString());
  await new PullStreamParser(dockerImageName, log).consume(stream);
}

const isImageCached = async(dockerode: Dockerode, imageName: DockerImageName): Promise<boolean> =>  {
  const dockerImageNames = await fetchDockerImageNames(dockerode);
  return dockerImageNames.some((dockerImageName) => dockerImageName.equals(imageName));
}

const fetchDockerImageNames = async(dockerode: Dockerode): Promise<DockerImageName[]> => {
  const images = await dockerode.listImages();

  return images.reduce((dockerImageNames: DockerImageName[], image) => {
    if (isDanglingImage(image)) {
      return dockerImageNames;
    }
    const dockerImageNamesForImage = image.RepoTags.map((imageRepoTag) => DockerImageName.fromString(imageRepoTag));
    return [...dockerImageNames, ...dockerImageNamesForImage];
  }, []);
}

const isDanglingImage = (image: Dockerode.ImageInfo) => {
  return image.RepoTags === null;
}
