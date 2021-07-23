import { DockerImageName } from "../../../docker-image-name";
import { listImages } from "./list-images";

export const imageExists = async (imageName: DockerImageName): Promise<boolean> => {
  return (await listImages()).some((image) => image.equals(imageName));
};
