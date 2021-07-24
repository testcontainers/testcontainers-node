import { DockerImageName } from "../../../docker-image-name";
import { dockerode } from "../../dockerode";
import Dockerode from "dockerode";
import { log } from "../../../logger";

export const listImages = async (): Promise<DockerImageName[]> => {
  try {
    const images = await dockerode.listImages();

    return images.reduce((dockerImageNames: DockerImageName[], image) => {
      if (isDanglingImage(image)) {
        return dockerImageNames;
      }
      const dockerImageNamesForImage = image.RepoTags.map((imageRepoTag) => DockerImageName.fromString(imageRepoTag));
      return [...dockerImageNames, ...dockerImageNamesForImage];
    }, []);
  } catch (err) {
    log.error(`Failed to list images: ${err}`);
    throw err;
  }
};

const isDanglingImage = (image: Dockerode.ImageInfo) => image.RepoTags === null;
