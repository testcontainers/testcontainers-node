import { DockerComposeDownOptions, DockerComposeOptions } from "./docker-compose-options";
import { log, pullLog } from "../logger";
import v1, { v2 } from "docker-compose";
import { defaultDockerComposeOptions } from "./docker-compose-options";
import { DockerComposeCompatibility } from "../system-info";

export interface DockerComposeClient {
  up: (options: DockerComposeOptions, services?: Array<string>) => Promise<void>;
  pull: (options: DockerComposeOptions, services?: Array<string>) => Promise<void>;
  stop: (options: DockerComposeOptions) => Promise<void>;
  down: (options: DockerComposeOptions, downOptions: DockerComposeDownOptions) => Promise<void>;
}

export function getDockerComposeClient(compat?: DockerComposeCompatibility): DockerComposeClient {
  switch (compat) {
    case undefined:
      return new MissingDockerComposeClient();
    case "v1":
      return new DockerComposeV1Client();
    case "v2":
      return new DockerComposeV2Client();
  }
}

class DockerComposeV1Client implements DockerComposeClient {
  async up(options: DockerComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Upping DockerCompose environment services ${services.join(", ")}...`);
        await v1.upMany(services, await defaultDockerComposeOptions(options));
      } else {
        log.info(`Upping DockerCompose environment...`);
        await v1.upAll(await defaultDockerComposeOptions(options));
      }
      log.info(`Upped DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) => {
        try {
          log.error(`Failed to up DockerCompose environment: ${error.message}`);
          await this.down(options, { removeVolumes: true, timeout: 0 });
        } catch {
          log.error(`Failed to down DockerCompose environment after failed up`);
        }
      });
    }
  }

  async pull(options: DockerComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Pulling DockerCompose environment images "${services.join('", "')}"...`);
        await v1.pullMany(services, await defaultDockerComposeOptions({ ...options, logger: pullLog }));
      } else {
        log.info(`Pulling DockerCompose environment images...`);
        await v1.pullAll(await defaultDockerComposeOptions({ ...options, logger: pullLog }));
      }
      log.info(`Pulled DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async () => log.error(`Failed to pull DockerCompose environment images: ${err}`));
    }
  }

  async stop(options: DockerComposeOptions): Promise<void> {
    try {
      log.info(`Stopping DockerCompose environment...`);
      await v1.stop(await defaultDockerComposeOptions(options));
      log.info(`Stopped DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async () => log.error(`Failed to stop DockerCompose environment: ${err}`));
    }
  }

  async down(options: DockerComposeOptions, downOptions: DockerComposeDownOptions): Promise<void> {
    try {
      log.info(`Downing DockerCompose environment...`);
      await v1.down({
        ...(await defaultDockerComposeOptions(options)),
        commandOptions: dockerComposeDownCommandOptions(downOptions),
      });
      log.info(`Downed DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async () => log.error(`Failed to down DockerCompose environment: ${err}`));
    }
  }
}

class DockerComposeV2Client implements DockerComposeClient {
  async up(options: DockerComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Upping DockerCompose environment services ${services.join(", ")}...`);
        await v2.upMany(services, await defaultDockerComposeOptions(options));
      } else {
        log.info(`Upping DockerCompose environment...`);
        await v2.upAll(await defaultDockerComposeOptions(options));
      }
      log.info(`Upped DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async (error: Error) => {
        try {
          log.error(`Failed to up DockerCompose environment: ${error.message}`);
          await this.down(options, { removeVolumes: true, timeout: 0 });
        } catch {
          log.error(`Failed to down DockerCompose environment after failed up`);
        }
      });
    }
  }

  async pull(options: DockerComposeOptions, services: Array<string> | undefined): Promise<void> {
    try {
      if (services) {
        log.info(`Pulling DockerCompose environment images "${services.join('", "')}"...`);
        await v2.pullMany(services, await defaultDockerComposeOptions({ ...options, logger: pullLog }));
      } else {
        log.info(`Pulling DockerCompose environment images...`);
        await v2.pullAll(await defaultDockerComposeOptions({ ...options, logger: pullLog }));
      }
      log.info(`Pulled DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async () => log.error(`Failed to pull DockerCompose environment images: ${err}`));
    }
  }

  async stop(options: DockerComposeOptions): Promise<void> {
    try {
      log.info(`Stopping DockerCompose environment...`);
      await v2.stop(await defaultDockerComposeOptions(options));
      log.info(`Stopped DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async () => log.error(`Failed to stop DockerCompose environment: ${err}`));
    }
  }

  async down(options: DockerComposeOptions, downOptions: DockerComposeDownOptions): Promise<void> {
    try {
      log.info(`Downing DockerCompose environment...`);
      await v2.down({
        ...(await defaultDockerComposeOptions(options)),
        commandOptions: dockerComposeDownCommandOptions(downOptions),
      });
      log.info(`Downed DockerCompose environment`);
    } catch (err) {
      await handleAndRethrow(err, async () => log.error(`Failed to down DockerCompose environment: ${err}`));
    }
  }
}

class MissingDockerComposeClient implements DockerComposeClient {
  up(): Promise<void> {
    throw new Error("DockerCompose is not installed");
  }

  pull(): Promise<void> {
    throw new Error("DockerCompose is not installed");
  }

  stop(): Promise<void> {
    throw new Error("DockerCompose is not installed");
  }

  down(): Promise<void> {
    throw new Error("DockerCompose is not installed");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAndRethrow(err: any, handle: (error: Error) => Promise<void>): Promise<never> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseError(err: any): Error {
    if (err instanceof Error) {
      return err;
    } else {
      return new Error(err.err.trim());
    }
  }

  const error = parseError(err);
  await handle(error);
  throw error;
}

function dockerComposeDownCommandOptions(options: DockerComposeDownOptions): string[] {
  const result: string[] = [];
  if (options.removeVolumes) {
    result.push("-v");
  }
  if (options.timeout) {
    result.push("-t", `${options.timeout / 1000}`);
  }
  return result;
}
