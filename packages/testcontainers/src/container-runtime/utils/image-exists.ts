import Dockerode from "dockerode";
import { hash, withFileLock } from "../../common";
import { ImageName } from "../image-name";

const existingImages = new Set<string>();

export async function imageExists(dockerode: Dockerode, imageName: ImageName): Promise<boolean> {
  return withFileLock(`testcontainers-node-image-${hash(imageName.string)}.lock`, async () => {
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
