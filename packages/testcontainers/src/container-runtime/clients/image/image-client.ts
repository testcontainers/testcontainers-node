import { ImageBuildOptions } from "dockerode";
import { ImageName } from "../../image-name";

export interface ImageClient {
  build(context: NodeJS.ReadableStream, opts: ImageBuildOptions): Promise<void>;
  pull(imageName: ImageName, opts?: { force: boolean }): Promise<void>;
  exists(imageName: ImageName): Promise<boolean>;
}
