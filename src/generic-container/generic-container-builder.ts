import { AuthConfig, BuildArgs, RegistryConfig } from "../docker/types";
import { ImagePullPolicy, PullPolicy } from "../pull-policy";
import { RandomUuid, Uuid } from "../uuid";
import { ReaperInstance } from "../reaper";
import { DockerImageName } from "../docker-image-name";
import path from "path";
import { log } from "../logger";
import { getDockerfileImages } from "../dockerfile-parser";
import { buildImage } from "../docker/functions/image/build-image";
import { getAuthConfig } from "../registry-auth-locator/get-auth-config";
import { GenericContainer } from "./generic-container";
import { dockerClient } from "../docker/docker-client";
import { imageExists } from "../docker/functions/image/image-exists";

export class GenericContainerBuilder {
  private buildArgs: BuildArgs = {};
  private pullPolicy: ImagePullPolicy = PullPolicy.defaultPolicy();
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

  public withPullPolicy(pullPolicy: ImagePullPolicy): this {
    this.pullPolicy = pullPolicy;
    return this;
  }

  public withCache(cache: boolean): this {
    this.cache = cache;
    return this;
  }

  // https://github.com/containers/buildah/issues/1034
  public async build(image = `localhost/${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`): Promise<GenericContainer> {
    const imageName = DockerImageName.fromString(image);

    await ReaperInstance.getInstance();

    const dockerfile = path.resolve(this.context, this.dockerfileName);
    log.debug(`Preparing to build Dockerfile: ${dockerfile}`);
    const imageNames = await getDockerfileImages(dockerfile, this.buildArgs);
    const { dockerode, indexServerAddress } = await dockerClient();
    const registryConfig = await this.getRegistryConfig(indexServerAddress, imageNames);

    await buildImage({
      imageName: imageName,
      context: this.context,
      dockerfileName: this.dockerfileName,
      buildArgs: this.buildArgs,
      pullPolicy: this.pullPolicy,
      cache: this.cache,
      registryConfig,
    });
    const container = new GenericContainer(imageName.toString());
    if (!(await imageExists(dockerode, imageName))) {
      throw new Error("Failed to build image");
    }
    return Promise.resolve(container);
  }

  private async getRegistryConfig(indexServerAddress: string, imageNames: DockerImageName[]): Promise<RegistryConfig> {
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
