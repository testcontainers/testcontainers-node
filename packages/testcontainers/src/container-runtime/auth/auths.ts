import { RegistryAuthLocator } from "./registry-auth-locator";
import { registryMatches } from "./registry-matches";
import { Auth, AuthConfig, ContainerRuntimeConfig } from "./types";

export class Auths implements RegistryAuthLocator {
  public getName(): string {
    return "Auths";
  }

  public async getAuthConfig(registry: string, dockerConfig: ContainerRuntimeConfig): Promise<AuthConfig | undefined> {
    const auth = this.findAuthEntry(registry, dockerConfig);
    if (!auth) {
      return undefined;
    }

    const authConfig: Partial<AuthConfig> = { registryAddress: registry };

    if (auth.email) {
      authConfig.email = auth.email;
    }

    if (auth.auth) {
      const decodedAuth = Buffer.from(auth.auth, "base64").toString();
      const [username, ...passwordParts] = decodedAuth.split(":");
      const password = passwordParts.join(":");

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

  private findAuthEntry(registry: string, dockerConfig: ContainerRuntimeConfig): Auth | undefined {
    const authEntries = dockerConfig.auths ?? {};

    for (const key in authEntries) {
      if (registryMatches(key, registry)) {
        return authEntries[key];
      }
    }

    return undefined;
  }
}
