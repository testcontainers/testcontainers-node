import type { TarSource } from "modern-tar/fs";
import { readdir, realpath } from "node:fs/promises";
import { join, posix } from "node:path";
import { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import type { ContentToCopy, DirectoryToCopy, FileToCopy } from "../types";

interface CreateTarOptions {
  files?: readonly FileToCopy[];
  directories?: readonly DirectoryToCopy[];
  contents?: readonly ContentToCopy[];
}

export async function createTar({ files = [], directories = [], contents = [] }: CreateTarOptions): Promise<Readable> {
  const [{ packTar }, fileSources, directorySources] = await Promise.all([
    import("modern-tar/fs"),
    Promise.all(
      files.map(async ({ source, target, mode }) => ({
        type: "file" as const,
        // Follow symlinks to their real path, otherwise the tar will contain the symlink itself.
        source: await realpath(source),
        target,
        mode,
        uid: 0,
        gid: 0,
      }))
    ),
    Promise.all(directories.map(createDirectorySources)),
  ]);
  const sources: TarSource[] = [...fileSources, ...directorySources.flat()];

  // TAR headers need the content size up front, so buffer unknown-length streams before packing.
  for (const { content, target, mode } of contents) {
    sources.push({
      type: "content",
      content: content instanceof Readable ? await buffer(content) : content,
      target,
      mode,
    });
  }

  return packTar(sources);
}

async function createDirectorySources({ source, target, mode }: DirectoryToCopy): Promise<TarSource[]> {
  const directory = await realpath(source);
  const entries = await readdir(directory, { withFileTypes: true });

  return entries.map((entry) => ({
    type: entry.isDirectory() ? "directory" : "file",
    source: join(directory, entry.name),
    target: posix.join(target, entry.name),
    mode,
    uid: 0,
    gid: 0,
  }));
}
