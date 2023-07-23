import Dockerode from "dockerode";
import { ImageName } from "../image-name";

export const imageExists = async (dockerode: Dockerode, imageName: ImageName): Promise<boolean> => {
  try {
    await dockerode.getImage(imageName.toString()).inspect();
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("no such image")) {
      return false;
    }
    throw err;
  }
};
