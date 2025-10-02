import { spawn } from "child_process";
import { log } from "../../common";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig, ContainerRuntimeConfig } from "./types";

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
      const sink = spawn(providerName, ["get"]);

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
          const parsedResponse = JSON.parse(response);
          return resolve({
            username: parsedResponse.Username,
            password: parsedResponse.Secret,
            registryAddress: parsedResponse.ServerURL ?? registry,
          });
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
