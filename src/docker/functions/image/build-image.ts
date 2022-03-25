import { DockerImageName } from "../../../docker-image-name";
import { PullPolicy } from "../../../pull-policy";
import { log } from "../../../logger";
import { findDockerIgnoreFiles } from "../../../docker-ignore";
import tar from "tar-fs";
import slash from "slash";
import byline from "byline";
import { dockerClient } from "../../docker-client";
import { createLabels } from "../create-labels";
import { BuildArgs, BuildContext, RegistryConfig } from "../../types";

export type BuildImageOptions = {
  imageName: DockerImageName;
  context: BuildContext;
  dockerfileName: string;
  buildArgs: BuildArgs;
  pullPolicy: PullPolicy;
  registryConfig: RegistryConfig;
};

export const buildImage = async (options: BuildImageOptions): Promise<void> => {
  try {
    log.info(`Building image '${options.imageName.toString()}' with context '${options.context}'`);

    const dockerIgnoreFiles = await findDockerIgnoreFiles(options.context, options.dockerfileName);
    const tarStream = tar.pack(options.context, { ignore: (name) => dockerIgnoreFiles.has(slash(name)) });
    const { dockerode } = await dockerClient;

    return new Promise((resolve) =>
      dockerode
        .buildImage(tarStream, {
          dockerfile: options.dockerfileName,
          buildargs: options.buildArgs,
          t: options.imageName.toString(),
          labels: createLabels(false, options.imageName),
          registryconfig: options.registryConfig,
          pull: options.pullPolicy.shouldPull() ? "any" : undefined,
        })
        .then((stream) => byline(stream))
        .then((stream) => {
          stream.setEncoding("utf-8");
          stream.on("data", (line) => log.trace(`${options.imageName.toString()}: ${line}`));
          stream.on("end", () => resolve());
        })
    );
  } catch (err) {
    log.error(`Failed to build image: ${err}`);
    throw err;
  }
};
