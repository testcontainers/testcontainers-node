import crypto from "node:crypto";
import { createReadStream } from "node:fs";

export function hash(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function hashFile(path: string): Promise<string> {
  const fileHash = crypto.createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    fileHash.update(chunk);
  }
  return fileHash.digest("hex");
}
