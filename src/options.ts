import { BuildContext } from "./docker-client";
import { DockerClientFactory } from "./docker-client-factory";
import { Uuid } from "./uuid";

export interface Options {
  context: BuildContext;
  dockerClientFactory: DockerClientFactory;
  uuid: Uuid;
  buildArgs: { [key: string]: string };
  imageName: string;
  imageTag: string;
  abortOnExistingImage: boolean;
}

export type WithArgument = (options: Options) => Options;

export const withContext = (context: BuildContext): WithArgument => {
  return (options: Options): Options => {
    options.context = context;
    return options;
  };
};

export const withDockerClientFactory = (factory: DockerClientFactory): WithArgument => {
  return (options: Options): Options => {
    options.dockerClientFactory = factory;
    return options;
  };
};

export const withUuid = (uuid: Uuid): WithArgument => {
  return (options: Options): Options => {
    options.uuid = uuid;
    return options;
  };
};

export const withBuildArg = (key: string, value: string): WithArgument => {
  return (options: Options): Options => {
    options.buildArgs[key] = value;
    return options;
  };
};

export const withImageName = (name: string): WithArgument => {
  return (options: Options): Options => {
    options.imageName = name;
    return options;
  };
};

export const withImageTag = (tag: string): WithArgument => {
  return (options: Options): Options => {
    options.imageTag = tag;
    return options;
  };
};

export const abortOnExistingImage = (): WithArgument => {
  return (options: Options): Options => {
    options.abortOnExistingImage = true;
    return options;
  };
};
