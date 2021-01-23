import { CredentialProvider } from "./credential-provider";
import { DockerConfig } from "./types";

export class CredsStore extends CredentialProvider {
  getName(): string {
    return "CredsStore";
  }

  isApplicable(registry: string, dockerConfig: DockerConfig): boolean {
    return dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0;
  }

  getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string {
    // @ts-ignore
    return dockerConfig.credsStore;
  }
}
