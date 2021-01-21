import fs from "fs/promises";
import os from "os";
import path from "path";
import { AuthConfig } from "./docker-client";

export type DockerConfig = {
  credHelpers?: { [registry: string]: string };
  credsStore?: string;
  auths?: Array<{ [registry: string]: { [auth: string]: string } }>;
};

const dockerConfigFile = path.resolve(os.homedir(), ".docker", "config.json");

const dockerConfigPromise: Promise<DockerConfig> = fs.readFile(dockerConfigFile).then((buffer) => {
  const object = JSON.parse(buffer.toString());

  return {
    credsStore: object.credsStore,
    credHelpers: object.credHelpers,
    auths: object.auths,
  };
});

export interface RegistryAuthLocator {
  applies(registry: string, dockerConfig: DockerConfig): boolean;
  getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig>;
}

export class CredHelpers implements RegistryAuthLocator {
  applies(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credHelpers !== undefined && dockerConfig.credHelpers[registry] !== undefined;
  }

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig> {
    return {} as AuthConfig;
  }
}

export class CredsStore implements RegistryAuthLocator {
  applies(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0;
  }

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig> {
    return {} as AuthConfig;
  }
}

export class Auths implements RegistryAuthLocator {
  applies(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.auths !== undefined && dockerConfig.auths.some((auth) => auth[registry] !== undefined);
  }

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig> {
    return {} as AuthConfig;
  }
}
