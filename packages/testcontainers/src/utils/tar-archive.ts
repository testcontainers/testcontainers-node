import { createReadStream, promises as fs, Stats } from "fs";
import path from "path";
import { Readable } from "stream";
import * as tarStream from "tar-stream";
import { Content, ContentToCopy, DirectoryToCopy, FileToCopy } from "../types";

export type TarArchiveOptions = {
  filesToCopy?: FileToCopy[];
  directoriesToCopy?: DirectoryToCopy[];
  contentsToCopy?: ContentToCopy[];
};

type TarArchiveEntry =
  | {
      header: tarStream.Headers;
      source: string;
    }
  | {
      header: tarStream.Headers;
      content: Buffer;
    };

export const createTarArchive = async (options: TarArchiveOptions): Promise<Readable> => {
  const entries = await collectTarArchiveEntries(options);
  const tar = tarStream.pack();

  void populateTarArchive(tar, entries).catch((err) => {
    tar.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  return tar;
};

const collectTarArchiveEntries = async (options: TarArchiveOptions): Promise<TarArchiveEntry[]> => {
  const entries: TarArchiveEntry[] = [];

  for (const fileToCopy of options.filesToCopy ?? []) {
    entries.push(await createFileArchiveEntry(fileToCopy.source, fileToCopy.target, fileToCopy.mode));
  }

  for (const directoryToCopy of options.directoriesToCopy ?? []) {
    await addDirectoryEntries(entries, directoryToCopy.source, directoryToCopy.target, directoryToCopy.mode, false);
  }

  for (const contentToCopy of options.contentsToCopy ?? []) {
    entries.push(await createContentArchiveEntry(contentToCopy.content, contentToCopy.target, contentToCopy.mode));
  }

  return entries;
};

const populateTarArchive = async (tar: tarStream.Pack, entries: TarArchiveEntry[]): Promise<void> => {
  for (const entry of entries) {
    if ("source" in entry) {
      await addFileToArchive(tar, entry.source, entry.header);
    } else {
      await addBufferEntry(tar, entry.content, entry.header);
    }
  }

  tar.finalize();
};

const addDirectoryEntries = async (
  entries: TarArchiveEntry[],
  source: string,
  target: string,
  mode: number | undefined,
  includeSelf: boolean
): Promise<void> => {
  const stats = await fs.lstat(source);
  if (stats.isSymbolicLink()) {
    entries.push(await createSymlinkArchiveEntry(source, target, stats, mode));
    return;
  }

  if (includeSelf) {
    entries.push(createDirectoryArchiveEntry(target, stats, mode));
  }

  const directoryEntries = await fs.readdir(source, { withFileTypes: true });
  for (const directoryEntry of directoryEntries) {
    const sourcePath = path.join(source, directoryEntry.name);
    const targetPath = joinTarPaths(target, directoryEntry.name);
    const entryStats = await fs.lstat(sourcePath);

    if (directoryEntry.isSymbolicLink()) {
      entries.push(await createSymlinkArchiveEntry(sourcePath, targetPath, entryStats, mode));
    } else if (entryStats.isDirectory()) {
      await addDirectoryEntries(entries, sourcePath, targetPath, mode, true);
    } else if (entryStats.isFile()) {
      entries.push(createFileArchiveEntryFromStats(sourcePath, targetPath, mode, entryStats));
    }
  }
};

const createDirectoryArchiveEntry = (target: string, stats: Stats, mode: number | undefined): TarArchiveEntry => ({
  content: Buffer.alloc(0),
  header: {
    name: normalizeTarPath(target),
    type: "directory",
    mode: getEntryMode(stats, mode),
    mtime: stats.mtime,
    uid: stats.uid,
    gid: stats.gid,
    size: 0,
  },
});

const createFileArchiveEntry = async (source: string, target: string, mode?: number): Promise<TarArchiveEntry> => {
  const stats = await fs.stat(source);

  return createFileArchiveEntryFromStats(source, target, mode, stats);
};

const createFileArchiveEntryFromStats = (
  source: string,
  target: string,
  mode: number | undefined,
  stats: Stats
): TarArchiveEntry => ({
  source,
  header: {
    name: normalizeTarPath(target),
    mode: getEntryMode(stats, mode),
    mtime: stats.mtime,
    uid: stats.uid,
    gid: stats.gid,
    size: stats.size,
  },
});

const createSymlinkArchiveEntry = async (
  source: string,
  target: string,
  stats: Stats,
  mode: number | undefined
): Promise<TarArchiveEntry> => ({
  content: Buffer.alloc(0),
  header: {
    name: normalizeTarPath(target),
    type: "symlink",
    linkname: await fs.readlink(source),
    mode: getEntryMode(stats, mode),
    mtime: stats.mtime,
    uid: stats.uid,
    gid: stats.gid,
    size: 0,
  },
});

const addFileToArchive = async (tar: tarStream.Pack, source: string, header: tarStream.Headers): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const entry = tar.entry(header, (err) => (err ? reject(err) : resolve()));
    const file = createReadStream(source);

    file.on("error", reject);
    entry.on("error", reject);
    file.pipe(entry);
  });
};

const createContentArchiveEntry = async (content: Content, target: string, mode?: number): Promise<TarArchiveEntry> => {
  const buffer = await toBuffer(content);

  return {
    content: buffer,
    header: {
      name: normalizeTarPath(target),
      mode,
      size: buffer.length,
    },
  };
};

const addBufferEntry = (tar: tarStream.Pack, content: Buffer, header: tarStream.Headers): Promise<void> =>
  new Promise((resolve, reject) => {
    tar.entry(header, content, (err) => (err ? reject(err) : resolve()));
  });

const toBuffer = async (content: Content): Promise<Buffer> => {
  if (Buffer.isBuffer(content)) {
    return content;
  }

  if (typeof content === "string") {
    return Buffer.from(content);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of content) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const getEntryMode = (stats: Stats, mode?: number): number => mode ?? stats.mode & 0o7777;

const joinTarPaths = (base: string, child: string): string => path.posix.join(normalizeTarPath(base), child);

const normalizeTarPath = (entryPath: string): string => entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
