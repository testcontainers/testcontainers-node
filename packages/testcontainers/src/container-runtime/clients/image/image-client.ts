import { ImageBuildOptions } from "dockerode";
import { ImageName } from "../../image-name.ts";

export interface ImageClient {
  build(context: string, opts: ImageBuildOptions): Promise<void>;
  pull(imageName: ImageName, opts?: { force: boolean; platform: string | undefined }): Promise<void>;
  exists(imageName: ImageName): Promise<boolean>;
}
