import * as crypto from "crypto";

export interface Uuid {
  nextUuid(): string;
}

export class RandomUuid implements Uuid {
  public nextUuid(): string {
    return crypto.randomBytes(16).toString("hex");
  }
}
