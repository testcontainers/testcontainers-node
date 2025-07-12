import { CredentialProvider } from "./credential-provider";
import { ContainerRuntimeConfig } from "./types";

export class CredHelpers extends CredentialProvider {
  public getName(): string {
    return "CredHelpers";
  }

  public getCredentialProviderName(registry: string, dockerConfig: ContainerRuntimeConfig): string | undefined {
    if (dockerConfig.credHelpers?.[registry] !== undefined) {
      return dockerConfig.credHelpers[registry];
    }
  }
}
