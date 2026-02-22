import { createWriteStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import tar from "tar-fs";
import tmp from "tmp";
import { Content, ContentToCopy, DirectoryToCopy, FileToCopy } from "../types";

type ArchiveToCopyToContainer = {
  filesToCopy?: FileToCopy[];
  directoriesToCopy?: DirectoryToCopy[];
  contentsToCopy?: ContentToCopy[];
};

export async function createArchiveToCopyToContainer({
  filesToCopy = [],
  directoriesToCopy = [],
  contentsToCopy = [],
}: ArchiveToCopyToContainer): Promise<Readable> {
  const stagingDirectory = tmp.dirSync({ unsafeCleanup: true });

  try {
    for (const { source, target, mode } of filesToCopy) {
      await copyFileToStagingDirectory(stagingDirectory.name, source, target, mode);
    }

    for (const { source, target, mode } of directoriesToCopy) {
      await copyDirectoryToStagingDirectory(stagingDirectory.name, source, target, mode);
    }

    for (const { content, target, mode } of contentsToCopy) {
      await copyContentToStagingDirectory(stagingDirectory.name, content, target, mode);
    }
  } catch (error) {
    stagingDirectory.removeCallback();
    throw error;
  }

  const archive = tar.pack(stagingDirectory.name, { dereference: true, umask: 0 } as tar.PackOptions);
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    stagingDirectory.removeCallback();
  };

  archive.once("end", cleanup);
  archive.once("close", cleanup);
  archive.once("error", cleanup);

  return archive;
}

async function copyFileToStagingDirectory(
  stagingDirectory: string,
  source: string,
  target: string,
  mode: number | undefined
): Promise<void> {
  const targetPath = getArchiveTargetPath(stagingDirectory, target);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(source, targetPath, { dereference: true });

  if (mode !== undefined) {
    await fs.chmod(targetPath, normalizeArchiveMode(mode));
  }
}

async function copyDirectoryToStagingDirectory(
  stagingDirectory: string,
  source: string,
  target: string,
  mode: number | undefined
): Promise<void> {
  const targetPath = getArchiveTargetPath(stagingDirectory, target);
  await fs.mkdir(targetPath, { recursive: true });

  const entries = await fs.readdir(source);
  await Promise.all(
    entries.map((entry) =>
      fs.cp(path.resolve(source, entry), path.resolve(targetPath, entry), { recursive: true, dereference: true })
    )
  );

  if (mode !== undefined) {
    await setModeRecursively(targetPath, normalizeArchiveMode(mode));
  }
}

async function copyContentToStagingDirectory(
  stagingDirectory: string,
  content: Content,
  target: string,
  mode: number | undefined
): Promise<void> {
  const targetPath = getArchiveTargetPath(stagingDirectory, target);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await writeContentToFile(content, targetPath);

  if (mode !== undefined) {
    await fs.chmod(targetPath, normalizeArchiveMode(mode));
  }
}

async function writeContentToFile(content: Content, targetPath: string): Promise<void> {
  if (content instanceof Readable) {
    await pipeline(content, createWriteStream(targetPath));
  } else {
    await fs.writeFile(targetPath, content);
  }
}

async function setModeRecursively(targetPath: string, mode: number): Promise<void> {
  await fs.chmod(targetPath, mode);

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.resolve(targetPath, entry.name);

      if (entry.isDirectory()) {
        await setModeRecursively(entryPath, mode);
      } else {
        await fs.chmod(entryPath, mode);
      }
    })
  );
}

function getArchiveTargetPath(stagingDirectory: string, target: string): string {
  const normalizedTarget = path.posix.resolve("/", target.replace(/\\/gu, "/"));
  const relativeTarget = normalizedTarget.slice(1);

  if (relativeTarget.length === 0) {
    return stagingDirectory;
  }

  return path.resolve(stagingDirectory, ...relativeTarget.split("/"));
}

function normalizeArchiveMode(mode: number): number {
  if (mode <= 0o777) {
    return mode;
  }

  if (mode <= 0o7777 && /^[0-7]+$/u.test(String(mode))) {
    return parseInt(String(mode), 8);
  }

  return mode;
}
