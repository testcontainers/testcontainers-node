import { AuthConfig, BuildArgs, RegistryConfig } from "../docker/types";
import { DefaultPullPolicy, PullPolicy } from "../pull-policy";
import path from "path";
import { log } from "@testcontainers/logger";
import { getDockerfileImages } from "../dockerfile-parser";
import { GenericContainer } from "./generic-container";
import { RandomUuid, Uuid } from "@testcontainers/common";
import { getContainerRuntimeClient, ImageName } from "@testcontainers/container-runtime";
import {
  LABEL_TESTCONTAINERS,
  LABEL_TESTCONTAINERS_LANG,
  LABEL_TESTCONTAINERS_SESSION_ID,
  LABEL_TESTCONTAINERS_VERSION,
} from "../labels";
import { getAuthConfig } from "@testcontainers/container-runtime/build/auth/get-auth-config";
import { getReaper } from "../reaper";
import { version } from "../../package.json";

export type BuildOptions = {
  deleteOnExit: boolean;
};

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
    const labels: Record<string, string> = {
      [LABEL_TESTCONTAINERS]: "true",
      [LABEL_TESTCONTAINERS_LANG]: "node",
      [LABEL_TESTCONTAINERS_VERSION]: version,
    };
    if (options.deleteOnExit) {
      labels[LABEL_TESTCONTAINERS_SESSION_ID] = reaper.sessionId;
    }

    log.info(`Building Dockerfile "${dockerfile}" as image "${imageName}"...`);
    await client.image.build(this.context, {
      t: imageName.string,
      dockerfile: this.dockerfileName,
      buildargs: this.buildArgs,
      pull: this.pullPolicy ? "true" : undefined,
      nocache: !this.cache,
      registryconfig: registryConfig,
      labels,
    });

    const container = new GenericContainer(imageName.string);
    if (!(await client.image.exists(imageName))) {
      throw new Error("Failed to build image");
    }
    return Promise.resolve(container);
  }

  // todo should be done by client
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
