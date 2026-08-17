import { CredentialProvider } from "./credential-provider";
import type { ContainerRuntimeConfig } from "./types";

export class CredsStore extends CredentialProvider {
  public getName(): string {
    return "CredsStore";
  }

  // biome-ignore lint/correctness/noUnusedFunctionParameters: inherited CredentialProvider signature, name is part of the published API
  public getCredentialProviderName(registry: string, dockerConfig: ContainerRuntimeConfig): string | undefined {
    if (dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0) {
      return dockerConfig.credsStore;
    }
  }
}
