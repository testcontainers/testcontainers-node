import { CredentialProvider } from "./credential-provider.js";
import { DockerConfig } from "./types.js";

export class CredsStore extends CredentialProvider {
  public getName(): string {
    return "CredsStore";
  }

  public getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string | undefined {
    if (dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0) {
      return dockerConfig.credsStore;
    }
  }
}
