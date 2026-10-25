import { spawn } from "node:child_process";
import { log } from "../../common";
import type { RegistryAuthLocator } from "./registry-auth-locator";
import type {
  AuthConfig,
  ContainerRuntimeConfig,
  CredentialProviderGetResponse,
  IdentityTokenAuthConfig,
  UsernamePasswordAuthConfig,
} from "./types";

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

    return await this.runCredentialProvider(registry, programName);
  }

  private runCredentialProvider(registry: string, providerName: string): Promise<AuthConfig | undefined> {
    return new Promise((resolve, reject) => {
      // On Windows a credential helper can be a .cmd script (e.g. docker-credential-gcloud.cmd), which Node only runs
      // through a shell: https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows
      const sink =
        process.platform === "win32" ? spawn(`${providerName} get`, { shell: true }) : spawn(providerName, ["get"]);

      const chunks: string[] = [];
      sink.stdout.on("data", (chunk) => chunks.push(chunk));

      sink.on("error", (err) => {
        log.error(`Error from Docker credential provider: ${err}`);
        sink.kill("SIGKILL");
        reject(new Error(`Error from Docker credential provider: ${err}`));
      });

      sink.on("close", (code) => {
        if (code !== 0) {
          return resolve(undefined);
        }

        const response = chunks.join("");
        try {
          const credentialProviderResponse = JSON.parse(response) as CredentialProviderGetResponse;

          const authConfig =
            credentialProviderResponse.Username === "<token>"
              ? this.parseIdentityTokenConfig(registry, credentialProviderResponse)
              : this.parseUsernamePasswordConfig(registry, credentialProviderResponse);

          return resolve(authConfig);
        } catch (_e) {
          log.error(`Unexpected response from Docker credential provider GET command: "${response}"`);
          return reject(new Error("Unexpected response from Docker credential provider GET command"));
        }
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }

  private parseUsernamePasswordConfig(
    registry: string,
    config: CredentialProviderGetResponse
  ): UsernamePasswordAuthConfig {
    return {
      username: config.Username,
      password: config.Secret,
      registryAddress: config.ServerURL ?? registry,
    };
  }

  private parseIdentityTokenConfig(registry: string, config: CredentialProviderGetResponse): IdentityTokenAuthConfig {
    return {
      registryAddress: config.ServerURL ?? registry,
      identityToken: config.Secret,
    };
  }
}
