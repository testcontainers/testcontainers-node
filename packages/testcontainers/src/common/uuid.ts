import crypto from "node:crypto";
import { hash } from "./hash.ts";

export interface Uuid {
  nextUuid(): string;
}

export class RandomUuid implements Uuid {
  public nextUuid(): string {
    return hash(crypto.randomUUID()).substring(0, 12);
  }
}
