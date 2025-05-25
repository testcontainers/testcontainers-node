import compose from "docker-compose";
import { log, pullLog, toSeconds } from "../../../common";
import { defaultComposeOptions } from "./default-compose-options";
import { ComposeDownOptions, ComposeOptions } from "./types";

export interface ComposeClient {
  version: string;
  up(options: ComposeOptions, services?: Array<string>): Promise<void>;
  pull(options: ComposeOptions, services?: Array<string>): Promise<void>;
  stop(options: ComposeOptions): Promise<void>;
  down(options: ComposeOptions, downOptions: ComposeDownOptions): Promise<void>;
}

export async function getComposeClient(environment: NodeJS.ProcessEnv): Promise<ComposeClient> {
  try {
    const version = (await compose.version()).data.version;
    return new DockerComposeClient(version, environment);
  } catch (err) {
    return new MissingComposeClient("N/A");
  }
}

class DockerComposeClient implements ComposeClient {
  constructor(
    public readonly version: string,
    private readonly environment: NodeJS.ProcessEnv
  ) {}

  async up(options: ComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Upping Compose environment services ${services.join(", ")}...`);
        await compose.upMany(services, defaultComposeOptions(this.environment, options));
      } else {
        log.info(`Upping Compose environment...`);
        await compose.upAll(defaultComposeOptions(this.environment, options));
      }
      log.info(`Upped Compose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) => {
        try {
          log.error(`Failed to up Compose environment: ${error.message}`);
          await this.down(options, { removeVolumes: true, timeout: 0 });
        } catch {
          log.error(`Failed to down Compose environment after failed up`);
        }
      });
    }
  }

  async pull(options: ComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Pulling Compose environment images "${services.join('", "')}"...`);
        await compose.pullMany(services, defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
      } else {
        log.info(`Pulling Compose environment images...`);
        await compose.pullAll(defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
      }
      log.info(`Pulled Compose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) =>
        log.error(`Failed to pull Compose environment images: ${error.message}`)
      );
    }
  }

  async stop(options: ComposeOptions): Promise<void> {
    try {
      log.info(`Stopping Compose environment...`);
      await compose.stop(defaultComposeOptions(this.environment, options));
      log.info(`Stopped Compose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) =>
        log.error(`Failed to stop Compose environment: ${error.message}`)
      );
    }
  }

  async down(options: ComposeOptions, downOptions: ComposeDownOptions): Promise<void> {
    try {
      log.info(`Downing Compose environment...`);
      await compose.down({
        ...defaultComposeOptions(this.environment, options),
        commandOptions: composeDownCommandOptions(downOptions),
      });
      log.info(`Downed Compose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) =>
        log.error(`Failed to down Compose environment: ${error.message}`)
      );
    }
  }
}

class MissingComposeClient implements ComposeClient {
  constructor(public readonly version: string) {}

  up(): Promise<void> {
    throw new Error("Compose is not installed");
  }

  pull(): Promise<void> {
    throw new Error("Compose is not installed");
  }

  stop(): Promise<void> {
    throw new Error("Compose is not installed");
  }

  down(): Promise<void> {
    throw new Error("Compose is not installed");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAndRethrow(err: any, handle: (error: Error) => Promise<void>): Promise<never> {
  const error = err instanceof Error ? err : new Error(err.err.trim());
  await handle(error);
  throw error;
}

function composeDownCommandOptions(options: ComposeDownOptions): string[] {
  const result: string[] = [];
  if (options.removeVolumes) {
    result.push("-v");
  }
  if (options.timeout) {
    result.push("-t", `${toSeconds(options.timeout)}`);
  }
  return result;
}
