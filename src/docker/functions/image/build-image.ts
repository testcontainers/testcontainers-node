// import { DockerImageName } from "../../../docker-image-name";
// import { PullPolicy } from "../../../pull-policy";
// import { buildLog, log } from "@testcontainers/logger";
// import tar from "tar-fs";
// import byline from "byline";
// import { getDockerClient } from "../../client/docker-client";
// import { createLabels } from "../create-labels";
// import { BuildArgs, RegistryConfig } from "../../types";
// import path from "path";
// import { existsSync, promises as fs } from "fs";
// import dockerIgnore from "@balena/dockerignore";
// import { ImageBuildOptions } from "dockerode";
//
// export type BuildImageOptions = {
//   imageName: DockerImageName;
//   context: string;
//   dockerfileName: string;
//   buildArgs: BuildArgs;
//   pullPolicy: PullPolicy;
//   registryConfig: RegistryConfig;
//   cache: boolean;
//   deleteOnExit: boolean;
// };
//
// export const buildImage = async (sessionId: string, options: BuildImageOptions): Promise<void> => {
//   try {
//     log.info(`Building image "${options.imageName.toString()}" with context "${options.context}"...`);
//
//     const isDockerIgnored = await createIsDockerIgnoredFunction(options.context);
//
//     const tarStream = tar.pack(options.context, {
//       ignore: (aPath) => {
//         const relativePath = path.relative(options.context, aPath);
//         if (relativePath === options.dockerfileName) {
//           return false;
//         } else {
//           return isDockerIgnored(relativePath);
//         }
//       },
//     });
//
//     const { dockerode } = await getDockerClient();
//
//     const buildImageOptions: ImageBuildOptions = {
//       dockerfile: options.dockerfileName,
//       nocache: !options.cache,
//       buildargs: options.buildArgs,
//       t: options.imageName.toString(),
//       labels: createLabels(sessionId, !options.deleteOnExit),
//       registryconfig: options.registryConfig,
//       pull: options.pullPolicy.shouldPull() ? "true" : undefined,
//     };
//     await new Promise<void>((resolve) => {
//       dockerode
//         .buildImage(tarStream, buildImageOptions)
//         .then((stream) => byline(stream))
//         .then((stream) => {
//           stream.setEncoding("utf-8");
//           stream.on("data", (line) => {
//             if (buildLog.enabled()) {
//               buildLog.trace(line, { imageName: options.imageName.toString() });
//             }
//           });
//           stream.on("end", () => resolve());
//         });
//     });
//     log.info(`Built image "${options.imageName.toString()}" with context "${options.context}"`);
//   } catch (err) {
//     log.error(`Failed to build image: ${err}`);
//     throw err;
//   }
// };
//
// const createIsDockerIgnoredFunction = async (context: string): Promise<(path: string) => boolean> => {
//   const dockerIgnoreFilePath = path.join(context, ".dockerignore");
//
//   if (!existsSync(dockerIgnoreFilePath)) {
//     return () => false;
//   }
//
//   const instance = dockerIgnore({ ignorecase: false });
//
//   const dockerIgnorePatterns = await fs.readFile(dockerIgnoreFilePath, { encoding: "utf-8" });
//   instance.add(dockerIgnorePatterns);
//
//   const filter = instance.createFilter();
//
//   return (aPath: string) => !filter(aPath);
// };
