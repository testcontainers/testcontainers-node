import { CredentialProvider } from "./credential-provider";
import { DockerConfig } from "./types";

export class CredHelpers extends CredentialProvider {
  public getName(): string {
    return "CredHelpers";
  }

  public getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string | undefined {
    if (dockerConfig.credHelpers !== undefined && dockerConfig.credHelpers[registry] !== undefined) {
      return dockerConfig.credHelpers[registry];
    }
  }
}
