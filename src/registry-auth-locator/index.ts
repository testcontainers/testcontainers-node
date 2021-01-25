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

const dockerConfigPromise = readDockerConfig();

const registryAuthLocators: RegistryAuthLocator[] = [new CredHelpers(), new CredsStore(), new Auths()];

export async function getAuthConfig(registry: string): Promise<AuthConfig | undefined> {
  const dockerConfig = await dockerConfigPromise;

  const registryAuthLocator = registryAuthLocators.find((authLocator) =>
    authLocator.isApplicable(registry, dockerConfig)
  );
  if (!registryAuthLocator) {
    log.debug(`No registry auth locator found for registry: "${registry}"`);
    return undefined;
  }

  log.debug(`Found applicable registry auth locator for registry "${registry}": ${registryAuthLocator.getName()}`);
  return await registryAuthLocator.getAuthConfig(registry, dockerConfig);
}
