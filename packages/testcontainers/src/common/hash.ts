import crypto from "node:crypto";

export function hash(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
