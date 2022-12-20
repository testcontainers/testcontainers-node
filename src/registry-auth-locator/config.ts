import os from "os";
import path from "path";
import { DockerConfig } from "./types";
import { existsSync, promises as fs } from "fs";

const dockerConfigLocation = process.env.DOCKER_CONFIG || `${os.homedir()}/.docker`;

const dockerConfigFile = path.resolve(dockerConfigLocation, "config.json");

/**
 * Read the docker config file from the default location and returns the {@link DockerConfig}.
 */
const readDockerConfigFromFile = async (): Promise<DockerConfig> => {
  const buffer = await fs.readFile(dockerConfigFile);
  const object = JSON.parse(buffer.toString());

  return {
    credsStore: object.credsStore,
    credHelpers: object.credHelpers,
    auths: object.auths,
  };
};

/**
 * Reads the docker config file from environment variable and returns the {@link DockerConfig}.
 *
 * Some CI environments (e.g. GitLab) encourages configuring docker using the environment variable
 * DOCKER_AUTH_CONFIG. If it exists, it will be used when there is no default config file.
 */
const readDockerConfigFromEnv = (): DockerConfig => {
  return JSON.parse(process.env.DOCKER_AUTH_CONFIG!);
};

/**
 * Reads the docker config file or environment variable and returns the {@link DockerConfig}.
 * If both exist, the config file will be used.
 */
export const readDockerConfig = async (): Promise<DockerConfig> => {
  if (existsSync(dockerConfigFile)) {
    return readDockerConfigFromFile();
  } else if (process.env.DOCKER_AUTH_CONFIG) {
    return readDockerConfigFromEnv();
  } else {
    return {};
  }
};
