import { CredentialProviderResponse, DockerConfig } from "./types";
import { AuthConfig } from "../docker-client";
import { log } from "../logger";
import { spawn } from "child_process";
import { RegistryAuthLocator } from "./registry-auth-locator";

export abstract class CredentialProvider implements RegistryAuthLocator {
  abstract isApplicable(registry: string, dockerConfig: DockerConfig): boolean;

  abstract getCredentialProviderName(registry: string, dockerConfig: DockerConfig): string;

  async getAuthConfig(registry: string, dockerConfig: DockerConfig): Promise<AuthConfig> {
    const programName = `docker-credential-${this.getCredentialProviderName(registry, dockerConfig)}`;
    log.debug(`Executing Docker credential provider: ${programName}`);

    const response = await this.runCredentialProvider(registry, programName);
    const authConfig: AuthConfig = {
      username: response.Username,
      password: response.Secret,
      registryAddress: response.ServerURL,
    };

    const obfuscatedAuthConfig = JSON.stringify({ ...authConfig, password: "*".repeat(10) });
    log.debug(`Docker credential provider found auth config for ${registry}: ${obfuscatedAuthConfig}`);

    return authConfig;
  }

  private runCredentialProvider(registry: string, providerName: string): Promise<CredentialProviderResponse> {
    return new Promise((resolve) => {
      const sink = spawn(providerName, ["get"]);

      const chunks: string[] = [];
      sink.stdout.on("data", (chunk) => chunks.push(chunk));

      sink.on("close", (code) => {
        log.debug(`Docker credential provider exited with code: ${code}`);
        resolve(JSON.parse(chunks.join("")));
      });

      sink.stdin.write(`${registry}\n`);
      sink.stdin.end();
    });
  }
}
