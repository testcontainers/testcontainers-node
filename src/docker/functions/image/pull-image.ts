import { DockerImageName } from "../../../docker-image-name";
import { log } from "../../../logger";
import { PullStreamParser } from "../../../pull-stream-parser";
import { AuthConfig } from "../../../docker-client";
import { dockerode } from "../../dockerode";
import Dockerode from "dockerode";

// todo rename DockerImageName => ImageName or Image

type PullImageOptions = {
  imageName: DockerImageName;
  force: boolean;
  authConfig: AuthConfig | undefined;
};

export const pullImage = async (options: PullImageOptions): Promise<void> => {
  if ((await isImagePulled(options.imageName)) && !options.force) {
    log.info(`Not pulling image as it already exists: ${options.imageName}`);
    return;
  }

  log.info(`Pulling image: ${options.imageName}`);
  const stream = await dockerode.pull(options.imageName.toString(), { authconfig: options.authConfig });

  await new PullStreamParser(options.imageName, log).consume(stream);
};

const isImagePulled = async (imageName: DockerImageName) =>
  (await listImages()).some((image) => image.equals(imageName));

const listImages = async (): Promise<DockerImageName[]> => {
  const images = await dockerode.listImages();

  return images.reduce((dockerImageNames: DockerImageName[], image) => {
    if (isDanglingImage(image)) {
      return dockerImageNames;
    }
    const dockerImageNamesForImage = image.RepoTags.map((imageRepoTag) => DockerImageName.fromString(imageRepoTag));
    return [...dockerImageNames, ...dockerImageNamesForImage];
  }, []);
};

const isDanglingImage = (image: Dockerode.ImageInfo) => image.RepoTags === null;
