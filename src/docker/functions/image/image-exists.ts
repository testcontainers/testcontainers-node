import { DockerImageName } from "../../../docker-image-name";
import Dockerode from "dockerode";
import AsyncLock from "async-lock";

const existingImages = new Set<string>();
const imageCheckLock = new AsyncLock();

export const imageExists = async (dockerode: Dockerode, imageName: DockerImageName): Promise<boolean> =>
  imageCheckLock.acquire(imageName.toString(), async () => {
    if (existingImages.has(imageName.toString())) {
      return true;
    }

    try {
      await dockerode.getImage(imageName.toString()).inspect();
      existingImages.add(imageName.toString());
      return true;
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("no such image")) {
        return false;
      }
      throw err;
    }
  });
