import { AuthConfig, BuildArgs, RegistryConfig } from "../types";
import path from "path";
import { GenericContainer } from "./generic-container";
import { ImagePullPolicy, PullPolicy } from "../utils/pull-policy";
import { log, RandomUuid, Uuid } from "../common";
import { getAuthConfig, getContainerRuntimeClient, ImageName } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { getDockerfileImages } from "../utils/dockerfile-parser";
import { createLabels, LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import tar from "tar-fs";
import { existsSync, promises as fs } from "fs";
import dockerIgnore from "@balena/dockerignore";
import Dockerode from "dockerode";

export type BuildOptions = {
  deleteOnExit: boolean;
};

export class GenericContainerBuilder {
  private buildArgs: BuildArgs = {};
  private pullPolicy: ImagePullPolicy = PullPolicy.defaultPolicy();
  private cache = true;
  private target?: string;

  constructor(
    private readonly context: NodeJS.ReadableStream | string,
    private readonly dockerfileName: string,
    private readonly uuid: Uuid = new RandomUuid()
  ) {}

  public withBuildArgs(buildArgs: BuildArgs): this {
    this.buildArgs = buildArgs;
    return this;
  }

  public withPullPolicy(pullPolicy: ImagePullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public withCache(cache: boolean): this {
    this.cache = cache;
    return this;
  }

  public withTarget(target: string): this {
    this.target = target;
    return this;
  }

  /**
   * Build the image.
   *
   * @param image - The image name to tag the built image with.
   * @param options - Options for the build. Defaults to `{ deleteOnExit: true }`.
   */
  public async build(
    image = `localhost/${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`,
    options: BuildOptions = { deleteOnExit: true }
  ): Promise<GenericContainer> {
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    const imageName = ImageName.fromString(image);
    const labels = createLabels();
    if (options.deleteOnExit) {
      labels[LABEL_TESTCONTAINERS_SESSION_ID] = reaper.sessionId;
    }

    let contextStream: NodeJS.ReadableStream;
    const imageBuildOptions: Dockerode.ImageBuildOptions = {
      t: imageName.string,
      dockerfile: this.dockerfileName,
      buildargs: this.buildArgs,
      pull: this.pullPolicy ? "true" : undefined,
      nocache: !this.cache,
      labels,
      target: this.target,
    };

    if (typeof this.context !== "string") {
      contextStream = this.context;
    } else {
      // Get the registry config for the images in the Dockerfile
      const dockerfile = path.resolve(this.context, this.dockerfileName);
      const imageNames = await getDockerfileImages(dockerfile, this.buildArgs);
      imageBuildOptions.registryconfig = await this.getRegistryConfig(
        client.info.containerRuntime.indexServerAddress,
        imageNames
      );

      // Create a tar stream of the context directory, excluding the files that are ignored by .dockerignore
      const dockerignoreFilter = await newDockerignoreFilter(this.context);
      contextStream = tar.pack(this.context, {
        ignore: (aPath) => {
          const relativePath = path.relative(<string>this.context, aPath);
          if (relativePath === this.dockerfileName) {
            return false;
          } else {
            return dockerignoreFilter(relativePath);
          }
        },
      });
    }

    log.info(`Building Dockerfile "${this.dockerfileName}" as image "${imageName.string}"...`);
    await client.image.build(contextStream, imageBuildOptions);

    const container = new GenericContainer(imageName.string);
    if (!(await client.image.exists(imageName))) {
      throw new Error("Failed to build image");
    }
    return Promise.resolve(container);
  }

  private async getRegistryConfig(indexServerAddress: string, imageNames: ImageName[]): Promise<RegistryConfig> {
    const authConfigs: AuthConfig[] = [];

    await Promise.all(
      imageNames.map(async (imageName) => {
        const authConfig = await getAuthConfig(imageName.registry ?? indexServerAddress);

        if (authConfig !== undefined) {
          authConfigs.push(authConfig);
        }
      })
    );

    return authConfigs
      .map((authConfig) => {
        return {
          [authConfig.registryAddress]: {
            username: authConfig.username,
            password: authConfig.password,
          },
        };
      })
      .reduce((prev, next) => ({ ...prev, ...next }), {} as RegistryConfig);
  }
}

async function newDockerignoreFilter(context: string): Promise<(path: string) => boolean> {
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
