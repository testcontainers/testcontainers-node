import { IDockerComposeOptions } from "docker-compose";
import { EOL } from "node:os";
import { ComposeOptions } from "./types.ts";
import { isNotEmptyString, composeLog } from "../../../common/index.ts";
import process from "node:process";

export function defaultComposeOptions(
  environment: NodeJS.ProcessEnv,
  options: ComposeOptions
): Partial<IDockerComposeOptions> {
  const log = options.logger ?? composeLog;

  return {
    log: false,
    callback: log.enabled()
      ? (chunk) => {
          chunk
            .toString()
            .split(EOL)
            .filter(isNotEmptyString)
            .forEach((line) => log.trace(line.trim()));
        }
      : undefined,
    cwd: options.filePath,
    config: options.files,
    composeOptions: options.composeOptions,
    commandOptions: options.commandOptions,
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: options.projectName,
      ...{ ...environment, ...options.environment },
    },
  };
}
