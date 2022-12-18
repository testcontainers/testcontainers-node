import { AuthConfig, BuildArgs, RegistryConfig } from "../docker/types";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import { RandomUuid, Uuid } from "../uuid";
import { ReaperInstance } from "../reaper";
import { DockerImageName } from "../docker-image-name";
import path from "path";
import { log } from "../logger";
import { getDockerfileImages } from "../dockerfile-parser";
import { buildImage } from "../docker/functions/image/build-image";
import { imageExists } from "../docker/functions/image/image-exists";
import { getAuthConfig } from "../registry-auth-locator";
import { GenericContainer } from "./generic-container";
import { dockerClient } from "../docker/docker-client";

export class GenericContainerBuilder {
  private buildArgs: BuildArgs = {};
  private pullPolicy: PullPolicy = new DefaultPullPolicy();
  private cache = true;

  constructor(
    private readonly context: string,
    private readonly dockerfileName: string,
    private readonly uuid: Uuid = new RandomUuid()
  ) {}

  public withBuildArgs(buildArgs: BuildArgs): GenericContainerBuilder {
    this.buildArgs = buildArgs;
    return this;
  }

  public withPullPolicy(pullPolicy: PullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public withCache(cache: boolean): this {
    this.cache = cache;
    return this;
  }

  public async build(image = `${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`): Promise<GenericContainer> {
    return this.buildAs(GenericContainer, image);
  }

  public async buildAs<T extends GenericContainer>(
    type: new (image: string) => T,
    image = `${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`
  ): Promise<T> {
    const imageName = DockerImageName.fromString(image);

    await ReaperInstance.getInstance();

    const dockerfile = path.resolve(this.context, this.dockerfileName);
    log.debug(`Preparing to build Dockerfile: ${dockerfile}`);
    const imageNames = await getDockerfileImages(dockerfile);
    const registryConfig = await this.getRegistryConfig(imageNames);

    await buildImage({
      imageName: imageName,
      context: this.context,
      dockerfileName: this.dockerfileName,
      buildArgs: this.buildArgs,
      pullPolicy: this.pullPolicy,
      cache: this.cache,
      registryConfig,
    });
    const container = new type(imageName.toString());

    if (!(await imageExists((await dockerClient()).dockerode, imageName))) {
      throw new Error("Failed to build image");
    }

    return Promise.resolve(container);
  }

  private async getRegistryConfig(imageNames: DockerImageName[]): Promise<RegistryConfig> {
    const authConfigs: AuthConfig[] = [];

    await Promise.all(
      imageNames.map(async (imageName) => {
        const authConfig = await getAuthConfig(imageName.registry);

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
