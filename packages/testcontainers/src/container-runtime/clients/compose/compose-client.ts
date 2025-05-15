import { default as v1, v2 } from "docker-compose";
import { log, pullLog } from "../../../common";
import { ComposeInfo } from "../types";
import { defaultComposeOptions } from "./default-compose-options";
import { ComposeDownOptions, ComposeOptions } from "./types";

export interface ComposeClient {
  getInfo(): Promise<ComposeInfo>;
  up(options: ComposeOptions, services?: Array<string>): Promise<void>;
  pull(options: ComposeOptions, services?: Array<string>): Promise<void>;
  stop(options: ComposeOptions): Promise<void>;
  down(options: ComposeOptions, downOptions: ComposeDownOptions): Promise<void>;
}

export function getComposeClient(environment: NodeJS.ProcessEnv): ComposeClient {
  return new LazyComposeClient(environment);
}

class LazyComposeClient implements ComposeClient {
  private info: ComposeInfo | undefined = undefined;
  private client: typeof v1 | typeof v2 | undefined = undefined;
  constructor(private readonly environment: NodeJS.ProcessEnv) {}

  async getInfo(): Promise<ComposeInfo | undefined> {
    if (this.info !== undefined) {
      return this.info;
    }

    try {
      this.info = {
        version: (await v2.version()).data.version,
        compatibility: "v2",
      };
    } catch (err) {
      try {
        this.info = {
          version: (await v1.version()).data.version,
          compatibility: "v1",
        };
      } catch {
        return undefined;
      }
    }

    return this.info;
  }

  private async getClient(): Promise<typeof v1 | typeof v2> {
    if (this.client !== undefined) {
      return this.client;
    }

    const info = await this.getInfo();
    switch (info?.compatibility) {
      case undefined:
        throw new Error("Compose is not installed");
      case "v1":
        this.client = v1;
        return v1;
      case "v2":
        this.client = v2;
        return v2;
    }
  }

  async up(options: ComposeOptions, services: Array<string> | undefined): Promise<void> {
    const client = await this.getClient();

    try {
      if (services) {
        log.info(`Upping Compose environment services ${services.join(", ")}...`);
        await client.upMany(services, await defaultComposeOptions(this.environment, options));
      } else {
        log.info(`Upping Compose environment...`);
        await client.upAll(await defaultComposeOptions(this.environment, options));
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
    const client = await this.getClient();

    try {
      if (services) {
        log.info(`Pulling Compose environment images "${services.join('", "')}"...`);
        await client.pullMany(services, await defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
      } else {
        log.info(`Pulling Compose environment images...`);
        await client.pullAll(await defaultComposeOptions(this.environment, { ...options, logger: pullLog }));
      }
      log.info(`Pulled Compose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) =>
        log.error(`Failed to pull Compose environment images: ${error.message}`)
      );
    }
  }

  async stop(options: ComposeOptions): Promise<void> {
    const client = await this.getClient();

    try {
      log.info(`Stopping Compose environment...`);
      await client.stop(await defaultComposeOptions(this.environment, options));
      log.info(`Stopped Compose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) =>
        log.error(`Failed to stop Compose environment: ${error.message}`)
      );
    }
  }

  async down(options: ComposeOptions, downOptions: ComposeDownOptions): Promise<void> {
    const client = await this.getClient();
    try {
      log.info(`Downing Compose environment...`);
      await client.down({
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
