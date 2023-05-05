import crypto from "crypto";

export interface Uuid {
  nextUuid(): string;
}

export class RandomUuid implements Uuid {
  public nextUuid(): string {
    return crypto.createHash("md5").update(crypto.randomUUID()).digest("hex").substring(0, 12);
  }
}
