import Dockerode, { ImageBuildOptions } from "dockerode";
import byline from "byline";
import { getAuthConfig } from "../../auth/get-auth-config";
import { ImageName } from "../../image-name";
import { ImageClient } from "./image-client";
import AsyncLock from "async-lock";
import { log, buildLog, pullLog } from "../../../common";
import stream from "stream";

export class DockerImageClient implements ImageClient {
  private readonly existingImages = new Set<string>();
  private readonly imageExistsLock = new AsyncLock();

  constructor(protected readonly dockerode: Dockerode, protected readonly indexServerAddress: string) {}

  async build(context: stream.Readable, opts: ImageBuildOptions): Promise<void> {
    try {
      log.debug(`Building image "${opts.t}"...`);
      await new Promise<void>((resolve) => {
        this.dockerode
          .buildImage(context, opts)
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
      log.debug(`Built image "${opts.t}"`);
    } catch (err) {
      log.error(`Failed to build image: ${err}`);
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

  async pull(imageName: ImageName, opts?: { force: boolean }): Promise<void> {
    try {
      if (!opts?.force && (await this.exists(imageName))) {
        log.debug(`Image "${imageName.string}" already exists`);
        return;
      }

      log.debug(`Pulling image "${imageName.string}"...`);
      const authconfig = await getAuthConfig(imageName.registry ?? this.indexServerAddress);
      const stream = await this.dockerode.pull(imageName.string, { authconfig });
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
