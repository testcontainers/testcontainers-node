import type { ImageBuildOptions } from "dockerode";
import path from "path";
import { log, RandomUuid, Uuid } from "../common";
import { getAuthConfig, getContainerRuntimeClient, ImageName } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { AuthConfig, BuildArgs, RegistryConfig } from "../types";
import { getDockerfileImages } from "../utils/dockerfile-parser";
import { createLabels, LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { ImagePullPolicy, PullPolicy } from "../utils/pull-policy";
import { GenericContainer } from "./generic-container";

export type BuildOptions = {
  deleteOnExit: boolean;
};

export class GenericContainerBuilder {
  private buildArgs: BuildArgs = {};
  private pullPolicy: ImagePullPolicy = PullPolicy.defaultPolicy();
  private cache = true;
  private target?: string;
  private platform?: string;

  constructor(
    private readonly context: string,
    private readonly dockerfileName: string,
    private readonly uuid: Uuid = new RandomUuid()
  ) {}

  public withBuildArgs(buildArgs: BuildArgs): GenericContainerBuilder {
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

  public withPlatform(platform: string): this {
    this.platform = platform;
    return this;
  }

  public withTarget(target: string): this {
    this.target = target;
    return this;
  }

  public async build(
    image = `localhost/${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`,
    options: BuildOptions = { deleteOnExit: true }
  ): Promise<GenericContainer> {
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    const imageName = ImageName.fromString(image);
    const dockerfile = path.resolve(this.context, this.dockerfileName);

    const imageNames = await getDockerfileImages(dockerfile, this.buildArgs);
    const registryConfig = await this.getRegistryConfig(client.info.containerRuntime.indexServerAddress, imageNames);
    const labels = createLabels();
    if (options.deleteOnExit) {
      labels[LABEL_TESTCONTAINERS_SESSION_ID] = reaper.sessionId;
    }

    log.info(`Building Dockerfile "${dockerfile}" as image "${imageName.string}"...`);

    const buildOptions: ImageBuildOptions = {
      t: imageName.string,
      dockerfile: this.dockerfileName,
      buildargs: this.buildArgs,
      nocache: !this.cache,
      registryconfig: registryConfig,
      labels,
      target: this.target,
      platform: this.platform,
    };

    if (this.pullPolicy.shouldPull()) {
      buildOptions.pull = "true";
    }

    await client.image.build(this.context, buildOptions);

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
