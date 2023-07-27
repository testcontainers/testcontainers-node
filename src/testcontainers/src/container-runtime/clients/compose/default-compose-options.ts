import { IDockerComposeOptions } from "docker-compose";
import { composeLog } from "../../logger";
import { EOL } from "os";
import { ComposeOptions } from "./types";
import { isNotEmptyString } from "../../../common";

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
