import { DockerImageName } from "../../../docker-image-name.js";
import { listImages } from "./list-images.js";
import { log } from "../../../logger.js";
import Dockerode from "dockerode";

export const imageExists = async (dockerode: Dockerode, imageName: DockerImageName): Promise<boolean> => {
  log.debug(`Checking if image exists: ${imageName}`);
  return (await listImages(dockerode)).some((image) => image.equals(imageName));
};
