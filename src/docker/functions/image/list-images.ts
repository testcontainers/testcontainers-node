import { DockerImageName } from "../../../docker-image-name";
import { dockerode } from "../../dockerode";
import Dockerode from "dockerode";

export const listImages = async (): Promise<DockerImageName[]> => {
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
