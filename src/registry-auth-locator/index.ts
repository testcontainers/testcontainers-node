import { CredHelpers } from "./cred-helpers";
import { CredsStore } from "./creds-store";
import { Auths } from "./auths";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { log } from "../logger";
import { AuthConfig } from "../docker/types";
import { readDockerConfig } from "./config";

const DEFAULT_REGISTRY = "https://index.docker.io/v1/";

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
