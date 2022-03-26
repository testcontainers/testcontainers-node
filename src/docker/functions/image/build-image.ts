import { DockerImageName } from "../../../docker-image-name";
import { PullPolicy } from "../../../pull-policy";
import { log } from "../../../logger";
import tar from "tar-fs";
import byline from "byline";
import { dockerClient } from "../../docker-client";
import { createLabels } from "../create-labels";
import { BuildArgs, BuildContext, RegistryConfig } from "../../types";
import path from "path";
import { existsSync, promises as fs } from "fs";
import dockerIgnore from "@balena/dockerignore";

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

    const isDockerIgnored = await isDockerIgnoredFilter(options.context);

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

const isDockerIgnoredFilter = async (context: BuildContext): Promise<(path: string) => boolean> => {
  const dockerIgnoreFilePath = path.join(context, ".dockerignore");

  if (!existsSync(dockerIgnoreFilePath)) {
    return () => true;
  }

  const instance = dockerIgnore({ ignorecase: false });

  const dockerIgnorePatterns = await fs.readFile(dockerIgnoreFilePath, { encoding: "utf-8" });
  instance.add(dockerIgnorePatterns);

  const filter = instance.createFilter();

  return (aPath: string) => !filter(aPath);
};
