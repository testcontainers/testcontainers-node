import path from "path";
import tmp from "tmp";
import { open } from "fs/promises";
import { log } from "./logger";
import lockFile from "proper-lockfile";

export async function withFileLock<T>(fileName: string, fn: () => T): Promise<T> {
  const file = path.resolve(tmp.tmpdir, fileName);
  await open(file, "w");

  let releaseLockFn;
  try {
    log.debug(`Acquiring lock file "${file}"...`);
    releaseLockFn = await lockFile.lock(file, { retries: { forever: true } });
    log.debug(`Acquired lock file "${file}"`);
    return await fn();
  } finally {
    if (releaseLockFn) {
      log.debug(`Releasing lock file "${file}"...`);
      await releaseLockFn();
      log.debug(`Released lock file "${file}"`);
    }
  }
}
