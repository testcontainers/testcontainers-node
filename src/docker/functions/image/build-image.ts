import { DockerImageName } from "../../../docker-image-name.js";
import { PullPolicy } from "../../../pull-policy.js";
import { log } from "../../../logger.js";
import tar from "tar-fs";
import byline from "byline";
import { dockerClient } from "../../docker-client.js";
import { createLabels } from "../create-labels.js";
import { BuildArgs, RegistryConfig } from "../../types.js";
import path from "path";
import { existsSync, promises as fs } from "fs";
import dockerIgnore from "@balena/dockerignore";
import { ImageBuildOptions } from "dockerode";

export type BuildImageOptions = {
  imageName: DockerImageName;
  context: string;
  dockerfileName: string;
  buildArgs: BuildArgs;
  pullPolicy: PullPolicy;
  registryConfig: RegistryConfig;
  cache: boolean;
};

export const buildImage = async (options: BuildImageOptions): Promise<void> => {
  try {
    log.info(`Building image '${options.imageName.toString()}' with context '${options.context}'`);

    const isDockerIgnored = await createIsDockerIgnoredFunction(options.context);

    const tarStream = tar.pack(options.context, {
      ignore: (aPath) => {
        const relativePath = path.relative(options.context, aPath);
        if (relativePath === options.dockerfileName) {
          return false;
        } else {
          return isDockerIgnored(relativePath);
        }
      },
    });

    const { dockerode } = await dockerClient();

    const buildImageOptions: ImageBuildOptions = {
      dockerfile: options.dockerfileName,
      // @ts-ignore
      nocache: !options.cache,
      buildargs: options.buildArgs,
      t: options.imageName.toString(),
      labels: createLabels(false, options.imageName),
      registryconfig: options.registryConfig,
      pull: options.pullPolicy.shouldPull() ? "any" : undefined,
    };
    return new Promise((resolve) => {
      dockerode
        .buildImage(tarStream, buildImageOptions)
        .then((stream) => byline(stream))
        .then((stream) => {
          stream.setEncoding("utf-8");
          stream.on("data", (line) => log.trace(`${options.imageName.toString()}: ${line}`));
          stream.on("end", () => resolve());
        });
    });
  } catch (err) {
    log.error(`Failed to build image: ${err}`);
    throw err;
  }
};

const createIsDockerIgnoredFunction = async (context: string): Promise<(path: string) => boolean> => {
  const dockerIgnoreFilePath = path.join(context, ".dockerignore");

  if (!existsSync(dockerIgnoreFilePath)) {
    return () => false;
  }

  const instance = dockerIgnore.default({ ignorecase: false });

  const dockerIgnorePatterns = await fs.readFile(dockerIgnoreFilePath, { encoding: "utf-8" });
  instance.add(dockerIgnorePatterns);

  const filter = instance.createFilter();

  return (aPath: string) => !filter(aPath);
};
