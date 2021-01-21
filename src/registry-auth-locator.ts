import { promises as fs } from "fs";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import { log } from "./logger";
import { AuthConfig } from "./docker-client";

type CredentialProviderResponse = {
  ServerURL: string;
  Username: string;
  Secret: string;
};

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
  getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig>;
}

abstract class CredentialProvider implements RegistryAuthLocator {
  abstract isApplicable(registry: string, dockerConfig: DockerConfig): boolean;

  abstract getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string;

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig> {
    const programName = `docker-credential-${this.getCredentialProviderName(registry, dockerConfig)}`;
    log.debug(`Executing Docker credential provider: ${programName}`);

    const response = await this.runCredentialProvider(registry, programName);
    const authConfig: AuthConfig = {
      username: response.Username,
      password: response.Secret,
      registryAddress: response.ServerURL,
    };

    const obfuscatedAuthConfig = JSON.stringify({ ...authConfig, password: "*".repeat(10) });
    log.debug(`Docker credential provider found auth config for ${registry}: ${obfuscatedAuthConfig}`);

    return authConfig;
  }

  private runCredentialProvider(registry: string, providerName: string): Promise<CredentialProviderResponse> {
    return new Promise((resolve) => {
      const sink = spawn(providerName, ["get"]);

      const chunks: string[] = [];
      sink.stdout.on("data", (chunk) => chunks.push(chunk));

      sink.on("close", (code) => {
        log.debug(`Docker credential provider exited with code: ${code}`);
        resolve(JSON.parse(chunks.join("")));
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }
}

export class CredHelpers extends CredentialProvider {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credHelpers !== undefined && dockerConfig.credHelpers[registry] !== undefined;
  }

  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string {
    // @ts-ignore
    return dockerConfig.credHelpers[registry];
  }
}

export class CredsStore extends CredentialProvider {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0;
  }

  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string {
    // @ts-ignore
    return dockerConfig.credsStore;
  }
}

export class Auths implements RegistryAuthLocator {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.auths !== undefined && dockerConfig.auths.some((auth) => auth[registry] !== undefined);
  }

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig> {
    const authConfig: Partial<AuthConfig> = { registryAddress: registry };

    // @ts-ignore
    const auth: Auth = dockerConfig.auths.find((auth) => auth[registry] !== undefined)[registry];

    if (auth.email) {
      authConfig.email = auth.email;
    }

    if (auth.auth) {
      const decodedAuth = Buffer.from(auth.auth, "base64").toString();
      const [username, password] = decodedAuth.split(":");
      authConfig.username = username;
      authConfig.password = password;
    } else {
      if (auth.username) {
        authConfig.username = auth.username;
      }
      if (auth.password) {
        authConfig.password = auth.password;
      }
    }

    return authConfig as AuthConfig;
  }
}
