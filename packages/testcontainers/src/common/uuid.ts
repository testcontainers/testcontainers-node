import crypto from "crypto";
import { hash } from "./hash";

export interface Uuid {
  nextUuid(): string;
}

export class RandomUuid implements Uuid {
  public nextUuid(): string {
    return hash(crypto.randomUUID()).substring(0, 12);
  }
}

const randomUuidGen = new RandomUuid();
export const randomUuid = () => randomUuidGen.nextUuid();
