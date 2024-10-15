import path from "node:path";
import os from "node:os";
import { AuthConfig, ContainerRuntimeConfig } from "./types.ts";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { CredHelpers } from "./cred-helpers.ts";
import { CredsStore } from "./creds-store.ts";
import { Auths } from "./auths.ts";
import { RegistryAuthLocator } from "./registry-auth-locator.ts";
import { log } from "../../common/index.ts";
import process from "node:process";

const dockerConfigLocation = process.env.DOCKER_CONFIG || `${os.homedir()}/.docker`;

const dockerConfigFile = path.resolve(dockerConfigLocation, "config.json");

const readDockerConfig = async (): Promise<ContainerRuntimeConfig> => {
  if (process.env.DOCKER_AUTH_CONFIG) {
    return parseDockerConfig(process.env.DOCKER_AUTH_CONFIG);
  } else if (existsSync(dockerConfigFile)) {
    return parseDockerConfig((await readFile(dockerConfigFile)).toString());
  } else {
    return Promise.resolve({});
  }
};

function parseDockerConfig(dockerConfig: string) {
  const object = JSON.parse(dockerConfig);

  return {
    credsStore: object.credsStore,
    credHelpers: object.credHelpers,
    auths: object.auths,
  };
}

const dockerConfig = readDockerConfig();

const registryAuthLocators: RegistryAuthLocator[] = [new CredHelpers(), new CredsStore(), new Auths()];

const authsCache = new Map<string, AuthConfig | undefined>();

export const getAuthConfig = async (registry: string): Promise<AuthConfig | undefined> => {
  if (authsCache.has(registry)) {
    log.debug(`Auth config cache hit for registry "${registry}"`);
    return authsCache.get(registry);
  }

  for (const registryAuthLocator of registryAuthLocators) {
    const authConfig = await registryAuthLocator.getAuthConfig(registry, await dockerConfig);

    if (authConfig) {
      log.debug(`Auth config found for registry "${registry}": ${registryAuthLocator.getName()}`);
      authsCache.set(registry, authConfig);
      return authConfig;
    }
  }

  log.debug(`No registry auth locator found for registry "${registry}"`);
  authsCache.set(registry, undefined);
  return undefined;
};
