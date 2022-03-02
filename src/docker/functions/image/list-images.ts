import { DockerImageName } from "../../../docker-image-name";
import { dockerClient } from "../../docker-client";
import Dockerode from "dockerode";
import { log } from "../../../logger";

export const listImages = async (): Promise<DockerImageName[]> => {
  try {
    const { dockerode } = await dockerClient;
    const images = await dockerode.listImages();

    return images.reduce((dockerImageNames: DockerImageName[], image) => {
      if (isDanglingImage(image)) {
        return dockerImageNames;
      }
      const repoTags = image.RepoTags ?? [];
      const dockerImageNamesForImage = repoTags.map((imageRepoTag) => DockerImageName.fromString(imageRepoTag));
      return [...dockerImageNames, ...dockerImageNamesForImage];
    }, []);
  } catch (err) {
    log.error(`Failed to list images: ${err}`);
    throw err;
  }
};

const isDanglingImage = (image: Dockerode.ImageInfo) => image.RepoTags === null;
