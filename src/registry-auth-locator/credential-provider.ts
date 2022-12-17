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
    if (!Object.keys(credentials).some((credential) => credential.includes(registry))) {
      log.debug(`No credential found for registry: "${registry}"`);
      return undefined;
    }

    const response = await this.runCredentialProvider(registry, programName);
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
          log.error("Unexpected error from Docker credential provider LIST command");
          reject(new Error("Unexpected error from Docker credential provider LIST command"));
          return;
        }
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch (e) {
          log.error(`Unexpected response from Docker credential provider LIST command: "${stdout}"`);
          reject(new Error("Unexpected response from Docker credential provider LIST command"));
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
          log.error(`Unexpected exit code from Docker credential provider GET command: ${code}`);
          reject(new Error("Unexpected exit code from Docker credential provider GET command"));
          return;
        }

        const response = chunks.join("");
        try {
          const parsedResponse = JSON.parse(response);
          resolve(parsedResponse);
        } catch (e) {
          log.error(`Unexpected response from Docker credential provider GET command: "${response}"`);
          reject(new Error("Unexpected response from Docker credential provider GET command"));
        }
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }
}
