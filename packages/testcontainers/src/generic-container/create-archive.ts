import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import tarFs from "tar-fs";
import tar from "tar-stream";
import type { ContentToCopy, DirectoryToCopy, FileToCopy } from "../types";

type ArchiveSources = {
  files?: FileToCopy[];
  directories?: DirectoryToCopy[];
  contents?: ContentToCopy[];
};

export function createArchive({ files = [], directories = [], contents = [] }: ArchiveSources): Readable {
  const pack = tar.pack();

  (async () => {
    for (const { source, target, mode } of files) {
      const options = { entries: [path.basename(source)], dereference: true, ignore: () => true };
      await packFromFs(pack, path.dirname(source), options, () => target, mode);
    }
    for (const { content, target, mode } of contents) {
      const data = typeof content === "string" || Buffer.isBuffer(content) ? content : await buffer(content);
      pack.entry({ name: toEntryName(target), mode }, data);
    }
    for (const { source, target, mode } of directories) {
      const options = { entries: await fs.readdir(source) };
      await packFromFs(pack, source, options, (name) => path.posix.join(target, name), mode);
    }
    pack.finalize();
  })().catch((err) => pack.destroy(err));

  return Readable.from(pack);
}

function packFromFs(
  pack: tar.Pack,
  cwd: string,
  sourceOptions: Pick<tarFs.PackOptions, "entries" | "dereference" | "ignore">,
  toTarget: (name: string) => string,
  mode: number | undefined
): Promise<void> {
  return new Promise((resolve) => {
    const options: tarFs.PackOptions & { umask: number } = {
      ...sourceOptions,
      pack,
      strict: false,
      finalize: false,
      finish: () => resolve(),
      umask: 0,
      map: (header) => ({
        ...header,
        name: toEntryName(toTarget(header.name)),
        mode: mode ?? defaultMode(header),
        uid: 0,
        gid: 0,
        uname: "",
        gname: "",
      }),
    };
    tarFs.pack(cwd, options);
  });
}

// fs.stat on Windows does not report usable directory permissions
function defaultMode(header: tarFs.Headers): number {
  return process.platform === "win32" && header.type === "directory" ? 0o755 : header.mode;
}

function toEntryName(target: string): string {
  return target.replace(/^\/+/, "");
}
