import { DockerConfig } from "./types";
import { AuthConfig } from "../docker/types";

export interface RegistryAuthLocator {
  getName(): string;
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean;
  getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig | undefined>;
}
