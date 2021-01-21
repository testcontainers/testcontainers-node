import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { AuthConfig } from "./docker-client";

type Auth = {
  auth?: string;
  email?: string;
  username?: string;
  password?: string;
};

export type DockerConfig = {
  credHelpers?: { [registry: string]: string };
  credsStore?: string;
  auths?: { [registry: string]: Auth }[];
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
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean;
  getAuthConfig(registry: string, dockerConfig: DockerConfig): AuthConfig;
}

interface CredentialProvider {
  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string;
}

export class CredHelpers implements RegistryAuthLocator, CredentialProvider {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credHelpers !== undefined && dockerConfig.credHelpers[registry] !== undefined;
  }

  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string {
    // @ts-ignore
    return dockerConfig.credHelpers[registry];
  }

  getAuthConfig(registry: string, dockerConfig: DockerConfig): AuthConfig {
    return {} as AuthConfig;
  }
}

export class CredsStore implements RegistryAuthLocator, CredentialProvider {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0;
  }

  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string {
    // @ts-ignore
    return dockerConfig.credsStore;
  }

  getAuthConfig(registry: string, dockerConfig: DockerConfig): AuthConfig {
    return {} as AuthConfig;
  }
}

export class Auths implements RegistryAuthLocator {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.auths !== undefined && dockerConfig.auths.some((auth) => auth[registry] !== undefined);
  }

  getAuthConfig(registry: string, dockerConfig: DockerConfig): AuthConfig {
    const authConfig: Partial<AuthConfig> = { registryAddress: registry };

    // @ts-ignore
    const auth: Auth = dockerConfig.auths.find((auth) => auth[registry] !== undefined)[registry];

    if (auth.email) {
      authConfig.email = auth.email;
    }
    if (auth.username) {
      authConfig.username = auth.username;
    }
    if (auth.password) {
      authConfig.password = auth.password;
    }

    if (auth.auth) {
      const decodedAuth = Buffer.from(auth.auth, "base64").toString();
      const [username, password] = decodedAuth.split(":");
      authConfig.username = username;
      authConfig.password = password;
    }

    return authConfig as AuthConfig;
  }
}
