import dockerIgnore from "@balena/dockerignore";
import AsyncLock from "async-lock";
import byline from "byline";
import Dockerode, { ImageBuildOptions, ImageInspectInfo } from "dockerode";
import { existsSync, promises as fs } from "fs";
import path from "path";
import tar from "tar-fs";
import { buildLog, log, pullLog } from "../../../common";
import { getAuthConfig } from "../../auth/get-auth-config";
import { ImageName } from "../../image-name";
import { ImageClient } from "./image-client";

export class DockerImageClient implements ImageClient {
  private readonly existingImages = new Set<string>();
  private readonly imageExistsLock = new AsyncLock();

  constructor(
    protected readonly dockerode: Dockerode,
    protected readonly indexServerAddress: string
  ) {}

  async build(context: string, opts: ImageBuildOptions): Promise<void> {
    try {
      log.debug(`Building image "${opts.t}" with context "${context}"...`);
      const isDockerIgnored = await this.createIsDockerIgnoredFunction(context);
      const tarStream = tar.pack(context, {
        ignore: (aPath) => {
          const relativePath = path.relative(context, aPath);
          if (relativePath === opts.dockerfile) {
            return false;
          } else {
            return isDockerIgnored(relativePath);
          }
        },
      });
      await new Promise<void>((resolve) => {
        this.dockerode
          .buildImage(tarStream, opts)
          .then((stream) => byline(stream))
          .then((stream) => {
            stream.setEncoding("utf-8");
            stream.on("data", (line) => {
              if (buildLog.enabled()) {
                buildLog.trace(line, { imageName: opts.t });
              }
            });
            stream.on("end", () => resolve());
          });
      });
      log.debug(`Built image "${opts.t}" with context "${context}"`);
    } catch (err) {
      log.error(`Failed to build image: ${err}`);
      throw err;
    }
  }

  private async createIsDockerIgnoredFunction(context: string): Promise<(path: string) => boolean> {
    const dockerIgnoreFilePath = path.join(context, ".dockerignore");
    if (!existsSync(dockerIgnoreFilePath)) {
      return () => false;
    }

    const dockerIgnorePatterns = await fs.readFile(dockerIgnoreFilePath, { encoding: "utf-8" });
    const instance = dockerIgnore({ ignorecase: false });
    instance.add(dockerIgnorePatterns);
    const filter = instance.createFilter();

    return (aPath: string) => !filter(aPath);
  }

  async inspect(imageName: ImageName): Promise<ImageInspectInfo> {
    try {
      log.debug(`Inspecting image: "${imageName.string}"...`);
      const imageInfo = await this.dockerode.getImage(imageName.string).inspect();
      log.debug(`Inspected image: "${imageName.string}"`);
      return imageInfo;
    } catch (err) {
      log.debug(`Failed to inspect image "${imageName.string}"`);
      throw err;
    }
  }

  async exists(imageName: ImageName): Promise<boolean> {
    return this.imageExistsLock.acquire(imageName.string, async () => {
      if (this.existingImages.has(imageName.string)) {
        return true;
      }
      try {
        log.debug(`Checking if image exists "${imageName.string}"...`);
        await this.dockerode.getImage(imageName.string).inspect();
        this.existingImages.add(imageName.string);
        log.debug(`Checked if image exists "${imageName.string}"`);
        return true;
      } catch (err) {
        if (err instanceof Error && err.message.toLowerCase().includes("no such image")) {
          log.debug(`Checked if image exists "${imageName.string}"`);
          return false;
        }
        log.debug(`Failed to check if image exists "${imageName.string}"`);
        throw err;
      }
    });
  }

  async pull(imageName: ImageName, opts?: { force: boolean; platform: string | undefined }): Promise<void> {
    try {
      if (!opts?.force && (await this.exists(imageName))) {
        log.debug(`Image "${imageName.string}" already exists`);
        return;
      }

      log.debug(`Pulling image "${imageName.string}"...`);
      const authconfig = await getAuthConfig(imageName.registry ?? this.indexServerAddress);
      const stream = await this.dockerode.pull(imageName.string, {
        authconfig,
        platform: opts?.platform,
      });
      await new Promise<void>((resolve) => {
        byline(stream).on("data", (line) => {
          if (pullLog.enabled()) {
            pullLog.trace(line, { imageName: imageName.string });
          }
        });
        stream.on("end", resolve);
      });
      log.debug(`Pulled image "${imageName.string}"`);
    } catch (err) {
      log.error(`Failed to pull image "${imageName.string}": ${err}`);
      throw err;
    }
  }
}
