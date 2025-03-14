import { default as dockerComposeV1, default as v1, v2 as dockerComposeV2, v2 } from "docker-compose";
import { log, pullLog } from "../../../common";
import { ComposeInfo } from "../types";
import { defaultComposeOptions } from "./default-compose-options";
import { ComposeDownOptions, ComposeOptions } from "./types";

export interface ComposeClient {
  info: ComposeInfo;
  up(options: ComposeOptions, services?: Array<string>): Promise<void>;
  pull(options: ComposeOptions, services?: Array<string>): Promise<void>;
  stop(options: ComposeOptions): Promise<void>;
  down(options: ComposeOptions, downOptions: ComposeDownOptions): Promise<void>;
}

export async function getComposeClient(environment: NodeJS.ProcessEnv): Promise<ComposeClient> {
  const info = await getComposeInfo();

  switch (info?.compatability) {
    case undefined:
      return new MissingComposeClient();
    case "v1":
      return new ComposeV1Client(info, environment);
    case "v2":
      return new ComposeV2Client(info, environment);
  }
}

async function getComposeInfo(): Promise<ComposeInfo | undefined> {
  try {
    return {
      version: (await dockerComposeV2.version()).data.version,
      compatability: "v2",
    };
  } catch (err) {
    try {
      return {
        version: (await dockerComposeV1.version()).data.version,
        compatability: "v1",
      };
    } catch {
      return undefined;
    }
  }
}

class ComposeV1Client implements ComposeClient {
  constructor(
    public readonly info: ComposeInfo,
    private readonly environment: NodeJS.ProcessEnv
  ) {}

  async up(options: ComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Upping Compose environment services ${services.join(", ")}...`);
        await v1.upMany(services, await defaultComposeOptions(this.environment, options));
      } else {
        log.info(`Upping Compose environment...`);
        await v1.upAll(await defaultComposeOptions(this.environment, options));
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
        await v1.pullMany(services, await defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
      } else {
        log.info(`Pulling Compose environment images...`);
        await v1.pullAll(await defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
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
      await v1.stop(await defaultComposeOptions(this.environment, options));
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
      await v1.down({
        ...(await defaultComposeOptions(this.environment, options)),
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

class ComposeV2Client implements ComposeClient {
  constructor(
    public readonly info: ComposeInfo,
    private readonly environment: NodeJS.ProcessEnv
  ) {}

  async up(options: ComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Upping Compose environment services ${services.join(", ")}...`);
        await v2.upMany(services, await defaultComposeOptions(this.environment, options));
      } else {
        log.info(`Upping Compose environment...`);
        await v2.upAll(await defaultComposeOptions(this.environment, options));
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
        await v2.pullMany(services, await defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
      } else {
        log.info(`Pulling Compose environment images...`);
        await v2.pullAll(await defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
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
      await v2.stop(await defaultComposeOptions(this.environment, options));
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
      await v2.down({
        ...(await defaultComposeOptions(this.environment, options)),
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
  public readonly info = undefined;

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
    result.push("-t", `${options.timeout / 1000}`);
  }
  return result;
}
