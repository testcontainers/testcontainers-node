import { CredentialProvider } from "./credential-provider.ts";
import { ContainerRuntimeConfig } from "./types.ts";

export class CredsStore extends CredentialProvider {
  public getName(): string {
    return "CredsStore";
  }

  public getCredentialProviderName(registry: string, dockerConfig: ContainerRuntimeConfig): string | undefined {
    if (dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0) {
      return dockerConfig.credsStore;
    }
  }
}
