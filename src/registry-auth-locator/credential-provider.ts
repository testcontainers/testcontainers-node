import { CredentialProviderGetResponse, CredentialProviderListResponse, DockerConfig } from "./types";
import { log } from "../logger";
import { exec, spawn } from "child_process";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig } from "../docker/types";

export abstract class CredentialProvider implements RegistryAuthLocator {
  abstract getName(): string;

  abstract getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string | undefined;

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig | undefined> {
    const credentialProviderName = this.getCredentialProviderName(registry, dockerConfig);
    if (!credentialProviderName) {
      return undefined;
    }

    const programName = `docker-credential-${credentialProviderName}`;
    log.debug(`Executing Docker credential provider: ${programName}`);

    const credentials = await this.listCredentials(programName);

    const resolvedRegistry = Object.keys(credentials).find((credential) => credential.includes(registry));
    if (resolvedRegistry === undefined) {
      log.debug(`No credential found for registry: "${registry}"`);
      return undefined;
    }

    const response = await this.runCredentialProvider(resolvedRegistry, programName);
    const authConfig: AuthConfig = {
      username: response.Username,
      password: response.Secret,
      registryAddress: response.ServerURL,
    };

    log.debug(`Docker credential provider found auth config for ${registry}`);

    return authConfig;
  }

  private listCredentials(providerName: string): Promise<CredentialProviderListResponse> {
    return new Promise((resolve, reject) => {
      exec(`${providerName} list`, (err, stdout) => {
        if (err) {
          const errorMessage = `An error occurred listing credentials: ${err}`;
          log.error(errorMessage);
          return reject(new Error(errorMessage));
        }
        try {
          const response = JSON.parse(stdout);
          return resolve(response);
        } catch (e) {
          const errorMessage = `Unexpected response from Docker credential provider LIST command: "${stdout}"`;
          log.error(errorMessage);
          return reject(new Error(errorMessage));
        }
      });
    });
  }

  private runCredentialProvider(registry: string, providerName: string): Promise<CredentialProviderGetResponse> {
    return new Promise((resolve, reject) => {
      const sink = spawn(providerName, ["get"]);

      const chunks: string[] = [];
      sink.stdout.on("data", (chunk) => chunks.push(chunk));

      sink.on("close", (code) => {
        if (code !== 0) {
          const errorMessage = `An error occurred getting a credential. Exit code: ${code}. Message: ${chunks.join(
            ""
          )}`;
          log.error(errorMessage);
          return reject(new Error(errorMessage));
        }

        const response = chunks.join("");
        try {
          const parsedResponse = JSON.parse(response);
          return resolve(parsedResponse);
        } catch (e) {
          const errorMessage = `Unexpected response from Docker credential provider GET command: "${response}"`;
          log.error(errorMessage);
          return reject(new Error(errorMessage));
        }
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }
}
