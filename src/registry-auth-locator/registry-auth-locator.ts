import { DockerConfig } from "./types";
import { AuthConfig } from "../docker/types";

export interface RegistryAuthLocator {
  getName(): string;
  getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig | undefined>;
}
