import { exec, spawn } from "child_process";
import { log } from "../../common";
import { RegistryAuthLocator } from "./registry-auth-locator";
import { registryMatches } from "./registry-matches";
import {
  AuthConfig,
  ContainerRuntimeConfig,
  CredentialProviderGetResponse,
  CredentialProviderListResponse,
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

    const credentials = await this.listCredentials(programName);

    const credentialForRegistry = Object.keys(credentials).find((aRegistry) => registryMatches(aRegistry, registry));
    if (!credentialForRegistry) {
      log.debug(`No credential found for registry "${registry}"`);
      return undefined;
    }

    const response = await this.runCredentialProvider(registry, programName);

    return {
      username: response.Username,
      password: response.Secret,
      registryAddress: response.ServerURL ?? credentialForRegistry,
    };
  }

  private listCredentials(providerName: string): Promise<CredentialProviderListResponse> {
    return new Promise((resolve, reject) => {
      exec(`${providerName} list`, (err, stdout, stderr) => {
        if (err) {
          if (stderr === "list is unimplemented\n") {
            return resolve({});
          }

          log.error(`An error occurred listing credentials: ${err}`);
          return reject(new Error("An error occurred listing credentials"));
        }
        try {
          const response = JSON.parse(stdout);
          return resolve(response);
        } catch (e) {
          log.error(`Unexpected response from Docker credential provider LIST command: "${stdout}"`);
          return reject(new Error("Unexpected response from Docker credential provider LIST command"));
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
