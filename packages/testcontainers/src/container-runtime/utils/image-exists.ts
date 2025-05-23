import AsyncLock from "async-lock";
import Dockerode from "dockerode";
import { ImageName } from "../image-name";

const existingImages = new Set<string>();
const imageCheckLock = new AsyncLock();

export async function imageExists(dockerode: Dockerode, imageName: ImageName): Promise<boolean> {
  return imageCheckLock.acquire(imageName.string, async () => {
    if (existingImages.has(imageName.string)) {
      return true;
    }

    try {
      await dockerode.getImage(imageName.string).inspect();
      existingImages.add(imageName.string);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("no such image")) {
        return false;
      }
      throw err;
    }
  });
}
