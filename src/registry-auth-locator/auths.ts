import { DockerConfig } from "./types";
import { AuthConfig } from "../docker-client";
import { RegistryAuthLocator } from "./registry-auth-locator";

export class Auths implements RegistryAuthLocator {
  getName(): string {
    return "Auths";
  }

  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.auths !== undefined && dockerConfig.auths.some((auth) => auth[registry] !== undefined);
  }

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig | undefined> {
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
