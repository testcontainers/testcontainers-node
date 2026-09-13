import Dockerode from "dockerode";
import { ImageName } from "../image-name";

export async function useLocalImage(dockerode: Dockerode, imageName: ImageName): Promise<boolean> {
  if (process.env.TESTCONTAINERS_PULL_POLICY !== "never") {
    return false;
  }

  // Bypass the existence cache: an image may have been removed since the last check.
  try {
    await dockerode.getImage(imageName.string).inspect();
  } catch (cause) {
    throw new Error(
      `Cannot use local image "${imageName.string}" with TESTCONTAINERS_PULL_POLICY=never; preload it before starting containers`,
      { cause }
    );
  }
  return true;
}
