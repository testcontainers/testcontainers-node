import { AuthConfig, ContainerRuntimeConfig } from "./types.ts";

export interface RegistryAuthLocator {
  getName(): string;
  getAuthConfig(registry: string, dockerConfig: ContainerRuntimeConfig): Promise<AuthConfig | undefined>;
}
