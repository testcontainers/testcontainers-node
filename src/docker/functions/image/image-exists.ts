import { DockerImageName } from "../../../docker-image-name";
import { log } from "../../../logger";
import Dockerode from "dockerode";
import AsyncLock from "async-lock";
import { listImages } from "./list-images";

const existingImages = new Set<string>();
const imageCheckLock = new AsyncLock();

export const imageExists = async (dockerode: Dockerode, imageName: DockerImageName): Promise<boolean> => {
  log.debug(`Checking if image exists: ${imageName}`);

  return imageCheckLock.acquire(imageName.toString(), async () => {
    if (existingImages.has(imageName.toString())) {
      return true;
    }

    const images = await listImages(dockerode);
    console.log("IMAGE EXISTS: ", imageName.toString(), images);
    images.forEach((name) => {
      existingImages.add(name.toString());
    });

    return existingImages.has(imageName.toString());
  });
};
