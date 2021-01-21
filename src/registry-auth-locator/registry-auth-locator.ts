import { AuthConfig } from "../docker-client";
import { DockerConfig } from "./types";

export interface RegistryAuthLocator {
  isApplicable(registry: string, dockerConfig: DockerConfig): boolean;
  getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig>;
}
