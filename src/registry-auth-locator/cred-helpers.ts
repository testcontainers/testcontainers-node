import { CredentialProvider } from "./credential-provider";
import { DockerConfig } from "./types";

export class CredHelpers extends CredentialProvider {
  getName(): string {
    return "CredHelpers";
  }

  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credHelpers !== undefined && dockerConfig.credHelpers[registry] !== undefined;
  }

  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string {
    // @ts-ignore
    return dockerConfig.credHelpers[registry];
  }
}
