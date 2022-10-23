import { DockerImageName } from "../../../docker-image-name.js";
import Dockerode from "dockerode";
import { log } from "../../../logger.js";

export const listImages = async (dockerode: Dockerode): Promise<DockerImageName[]> => {
  try {
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
