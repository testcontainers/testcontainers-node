import { BuildArgs, BuildContext } from "./docker-client";
import { DockerClientFactory, DockerodeClientFactory } from "./docker-client-factory";
import { GenericContainer } from "./generic-container";
import { ImageNameBuilder } from "./image-name-builder";
import { RepoTag } from "./repo-tag";
import { RandomUuid, Uuid } from "./uuid";

export class GenericContainerBuilder {
  private readonly imageNameBuilder: ImageNameBuilder;
  private buildArgs: BuildArgs = {};

  constructor(
    private readonly context: BuildContext,
    private readonly uuid: Uuid = new RandomUuid(),
    private readonly dockerClientFactory: DockerClientFactory = new DockerodeClientFactory()
  ) {
    this.imageNameBuilder = new ImageNameBuilder(uuid, this);
  }

  public withBuildArg(key: string, value: string): GenericContainerBuilder {
    this.buildArgs[key] = value;
    return this;
  }

  public withImage(): ImageNameBuilder {
    return this.imageNameBuilder;
  }

  public async build(): Promise<GenericContainer> {
    const image = this.imageNameBuilder.getName();
    const tag = this.imageNameBuilder.getTag();
    const repoTag = new RepoTag(image, tag);
    const dockerClient = this.dockerClientFactory.getClient();
    await dockerClient.buildImage(repoTag, this.context, this.buildArgs, this.imageNameBuilder.shouldForceRebuild());
    const container = new GenericContainer(image, tag);

    if (!(await container.hasRepoTagLocally())) {
      throw new Error("Failed to build image");
    }

    return Promise.resolve(container);
  }
}
