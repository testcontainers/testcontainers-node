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
          log.error("An error occurred listing credentials");
          return reject(err);
        }
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch (e) {
          log.error(`Unexpected response from Docker credential provider LIST command: "${stdout}"`);
        }
      });
    });
  }

  private runCredentialProvider(registry: string, providerName: string): Promise<CredentialProviderGetResponse> {
    return new Promise((resolve) => {
      const sink = spawn(providerName, ["get"]);

      const chunks: string[] = [];
      sink.stdout.on("data", (chunk) => chunks.push(chunk));

      sink.on("close", (code) => {
        if (code === 0) {
          log.debug(`Docker credential provider exited with code: ${code}`);
        } else {
          log.warn(`Docker credential provider exited with code: ${code}`);
        }

        const response = chunks.join("");
        try {
          const parsedResponse = JSON.parse(response);
          resolve(parsedResponse);
        } catch (e) {
          log.error(`Unexpected response from Docker credential provider GET command: "${response}"`);
        }
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }
}
