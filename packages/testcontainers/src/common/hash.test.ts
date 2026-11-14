import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hash, hashFile } from "./hash";

test("should return a consistent hash", () => {
  const str = "Hello, world!";

  expect(hash(str)).toBe("315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3");
  expect(hash(str)).toBe("315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3");
});

test("should hash a file by its content", async () => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "testcontainers-"));
  try {
    const file = path.join(directory, "file.txt");
    await fs.writeFile(file, "Hello, world!");

    expect(await hashFile(file)).toBe(hash("Hello, world!"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
