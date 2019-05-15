import { Log, LogWaitStrategy, WaitStrategy } from "./wait-strategy";

export class Wait {
  public static forLogMessage(message: Log): WaitStrategy {
    return new LogWaitStrategy(message);
  }
}
