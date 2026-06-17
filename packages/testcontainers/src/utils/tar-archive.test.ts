import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { Readable } from "stream";
import * as tarStream from "tar-stream";
import { createTarArchive } from "./tar-archive";

describe("createTarArchive", () => {
  it("should reject if a file to copy cannot be read", async () => {
    await expect(
      createTarArchive({
        filesToCopy: [{ source: path.join(__dirname, "does-not-exist"), target: "/tmp/does-not-exist" }],
      })
    ).rejects.toThrow();
  });

  it("should normalize Windows-style target paths", async () => {
    const source = await fs.mkdtemp(path.join(tmpdir(), "testcontainers-tar-archive-"));
    await fs.writeFile(path.join(source, "test.txt"), "hello world");

    try {
      const archive = await createTarArchive({
        directoriesToCopy: [{ source, target: "\\tmp\\windows-dir" }],
      });

      const entries = await getTarEntries(archive);

      expect(entries.map((entry) => entry.name)).toEqual(["tmp/windows-dir/test.txt"]);
    } finally {
      await fs.rm(source, { recursive: true, force: true });
    }
  });

  it("should preserve symlinks in copied directories without following them", async () => {
    const source = await fs.mkdtemp(path.join(tmpdir(), "testcontainers-tar-archive-"));
    const outside = await fs.mkdtemp(path.join(tmpdir(), "testcontainers-tar-archive-outside-"));
    const outsideFile = path.join(outside, "secret.txt");
    await fs.writeFile(outsideFile, "do not archive");

    try {
      const fileSymlinkCreated = await createSymlinkOrSkip(outsideFile, path.join(source, "linked-file"), "file");
      const directorySymlinkCreated = await createSymlinkOrSkip(outside, path.join(source, "linked-dir"), "dir");
      if (!fileSymlinkCreated || !directorySymlinkCreated) {
        return;
      }

      const archive = await createTarArchive({
        directoriesToCopy: [{ source, target: "/tmp/symlinks" }],
      });

      const entries = await getTarEntries(archive);

      expect(entries.map((entry) => entry.name)).not.toContain("tmp/symlinks/linked-dir/secret.txt");
      expect(entries.map(({ linkname, name, type }) => ({ linkname, name, type })).sort(byName)).toEqual([
        { linkname: outside, name: "tmp/symlinks/linked-dir", type: "symlink" },
        { linkname: outsideFile, name: "tmp/symlinks/linked-file", type: "symlink" },
      ]);
    } finally {
      await fs.rm(source, { recursive: true, force: true });
      await fs.rm(outside, { recursive: true, force: true });
    }
  });
});

const createSymlinkOrSkip = async (target: string, symlinkPath: string, type: "dir" | "file"): Promise<boolean> => {
  try {
    await fs.symlink(target, symlinkPath, type);
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP") {
      return false;
    }
    throw err;
  }
};

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);

const getTarEntries = (archive: Readable): Promise<tarStream.Headers[]> =>
  new Promise((resolve, reject) => {
    const extract = tarStream.extract();
    const entries: tarStream.Headers[] = [];

    extract.on("entry", (header, stream, next) => {
      entries.push(header);
      stream.resume();
      stream.on("end", () => next());
      stream.on("error", reject);
    });
    extract.on("finish", () => resolve(entries));
    extract.on("error", reject);
    archive.on("error", reject);
    archive.pipe(extract);
  });
