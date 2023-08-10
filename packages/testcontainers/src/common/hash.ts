import crypto from "crypto";

export function hash(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}
