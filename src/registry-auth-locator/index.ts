import * as path from "path";
import * as os from "os";
import { DockerConfig } from "./types.js";
import { existsSync, promises as fs } from "fs";
import { CredHelpers } from "./cred-helpers.js";
import { CredsStore } from "./creds-store.js";
import { Auths } from "./auths.js";
import { RegistryAuthLocator } from "./registry-auth-locator.js";
import { log } from "../logger.js";
import { AuthConfig } from "../docker/types.js";

const DEFAULT_REGISTRY = "https://index.docker.io/v1/";

const dockerConfigLocation = process.env.DOCKER_CONFIG || `${os.homedir()}/.docker`;

const dockerConfigFile = path.resolve(dockerConfigLocation, "config.json");

const readDockerConfig = async (): Promise<DockerConfig> => {
  if (!existsSync(dockerConfigFile)) {
    return Promise.resolve({});
  }

  const buffer = await fs.readFile(dockerConfigFile);
  const object = JSON.parse(buffer.toString());

  return {
    credsStore: object.credsStore,
    credHelpers: object.credHelpers,
    auths: object.auths,
  };
};

const dockerConfig = readDockerConfig();

const registryAuthLocators: RegistryAuthLocator[] = [new CredHelpers(), new CredsStore(), new Auths()];

const authsCache = new Map<string, AuthConfig | undefined>();

export const getAuthConfig = async (registry = DEFAULT_REGISTRY): Promise<AuthConfig | undefined> => {
  if (authsCache.has(registry)) {
    log.debug(`Re-using cached auth for registry ${registry}`);
    return authsCache.get(registry);
  }

  for (const registryAuthLocator of registryAuthLocators) {
    const authConfig = await registryAuthLocator.getAuthConfig(registry, await dockerConfig);

    if (authConfig) {
      log.debug(`Found applicable registry auth locator for registry "${registry}": ${registryAuthLocator.getName()}`);
      authsCache.set(registry, authConfig);
      return authConfig;
    }
  }

  log.debug(`No registry auth locator found for registry: "${registry}"`);
  authsCache.set(registry, undefined);
  return undefined;
};
