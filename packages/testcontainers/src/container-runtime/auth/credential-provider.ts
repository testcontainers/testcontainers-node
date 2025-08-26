import { spawn } from "child_process";
import { log } from "../../common";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig, ContainerRuntimeConfig, CredentialProviderGetResponse } from "./types";

export abstract class CredentialProvider implements RegistryAuthLocator {
  abstract getName(): string;

  abstract getCredentialProviderName(registry: string, dockerConfig: ContainerRuntimeConfig): string | undefined;

  async getAuthConfig(registry: string, dockerConfig: ContainerRuntimeConfig): Promise<AuthConfig | undefined> {
    const credentialProviderName = this.getCredentialProviderName(registry, dockerConfig);
    if (!credentialProviderName) {
      return undefined;
    }

    const programName = `docker-credential-${credentialProviderName}`;
    log.debug(`Executing Docker credential provider "${programName}"`);

    const response = await this.runCredentialProvider(registry, programName);

    return {
      username: response.Username,
      password: response.Secret,
      registryAddress: response.ServerURL ?? registry,
    };
  }

  private runCredentialProvider(registry: string, providerName: string): Promise<CredentialProviderGetResponse> {
    return new Promise((resolve, reject) => {
      const sink = spawn(providerName, ["get"]);

      const chunks: string[] = [];
      sink.stdout.on("data", (chunk) => chunks.push(chunk));

      sink.on("close", (code) => {
        if (code !== 0) {
          log.error(`An error occurred getting a credential: ${code}`);
          return reject(new Error("An error occurred getting a credential"));
        }

        const response = chunks.join("");
        try {
          const parsedResponse = JSON.parse(response);
          return resolve(parsedResponse);
        } catch (e) {
          log.error(`Unexpected response from Docker credential provider GET command: "${response}"`);
          return reject(new Error("Unexpected response from Docker credential provider GET command"));
        }
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }
}
