import path from "path";
import tmp from "tmp";
import { writeFile } from "fs/promises";
import { log } from "@testcontainers/logger";
import lockFile from "proper-lockfile";

export async function withFileLock<T>(fileName: string, fn: () => T): Promise<T> {
  const file = await createEmptyTmpFile(fileName);

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

async function createEmptyTmpFile(fileName: string): Promise<string> {
  const file = path.resolve(tmp.tmpdir, fileName);
  await writeFile(file, "");
  return file;
}
