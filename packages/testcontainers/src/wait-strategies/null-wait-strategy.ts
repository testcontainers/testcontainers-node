import { AbstractWaitStrategy } from "./wait-strategy";

export class NullWaitStrategy extends AbstractWaitStrategy {
  public override waitUntilReady(): Promise<void> {
    return Promise.resolve();
  }
}
