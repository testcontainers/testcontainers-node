import { CredentialProvider } from "./credential-provider.ts";
import { ContainerRuntimeConfig } from "./types.ts";

export class CredHelpers extends CredentialProvider {
  public getName(): string {
    return "CredHelpers";
  }

  public getCredentialProviderName(registry: string, dockerConfig: ContainerRuntimeConfig): string | undefined {
    if (dockerConfig.credHelpers !== undefined && dockerConfig.credHelpers[registry] !== undefined) {
      return dockerConfig.credHelpers[registry];
    }
  }
}
