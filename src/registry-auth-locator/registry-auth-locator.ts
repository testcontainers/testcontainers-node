import { DockerConfig } from "./types.js";
import { AuthConfig } from "../docker/types.js";

export interface RegistryAuthLocator {
  getName(): string;
  getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig | undefined>;
}
