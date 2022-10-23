import { DockerImageName } from "../../../docker-image-name";
import { listImages } from "./list-images";
import { log } from "../../../logger";
import Dockerode from "dockerode";

export const imageExists = async (dockerode: Dockerode, imageName: DockerImageName): Promise<boolean> => {
  log.debug(`Checking if image exists: ${imageName}`);
  return (await listImages(dockerode)).some((image) => image.equals(imageName));
};
