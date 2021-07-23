import { Auth, DockerConfig } from "./types";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig } from "../docker/types";

export class Auths implements RegistryAuthLocator {
  getName(): string {
    return "Auths";
  }

  findAuthEntry(registry: string, dockerConfig: DockerConfig): Auth | null {
    const authEntries = dockerConfig.auths ?? {};
    for (const key in authEntries) {
      if (key === registry || key.includes(`://${registry}`)) {
        return authEntries[key];
      }
    }
    return null;
  }

  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return this.findAuthEntry(registry, dockerConfig) !== null;
  }

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig | undefined> {
    const authConfig: Partial<AuthConfig> = { registryAddress: registry };

    const auth = this.findAuthEntry(registry, dockerConfig);

    if (auth === null) {
      return undefined;
    }

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
