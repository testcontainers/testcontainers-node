import path from "path";
import os from "os";
import { DockerConfig } from "./types";
import { promises as fs, existsSync } from "fs";
import { CredHelpers } from "./cred-helpers";
import { CredsStore } from "./creds-store";
import { Auths } from "./auths";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig } from "../docker-client";
import { log } from "../logger";

const DEFAULT_REGISTRY_NAME = "index.docker.io";
const dockerConfigFile = path.resolve(os.homedir(), ".docker", "config.json");

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

function effectiveRegistryName(imageRegistryName?: string): string {
  return imageRegistryName ?? DEFAULT_REGISTRY_NAME;
}

const dockerConfigPromise = readDockerConfig();

const registryAuthLocators: RegistryAuthLocator[] = [new CredHelpers(), new CredsStore(), new Auths()];

export async function getAuthConfig(registry: string | undefined): Promise<AuthConfig | undefined> {
  const dockerConfig = await dockerConfigPromise;

  const registryName = effectiveRegistryName(registry);

  const registryAuthLocator = registryAuthLocators.find((authLocator) =>
    authLocator.isApplicable(registryName, dockerConfig)
  );
  if (!registryAuthLocator) {
    log.debug(`No registry auth locator found for registry: "${registryName}"`);
    return undefined;
  }

  log.debug(`Found applicable registry auth locator for registry "${registryName}": ${registryAuthLocator.getName()}`);
  return await registryAuthLocator.getAuthConfig(registryName, dockerConfig);
}
