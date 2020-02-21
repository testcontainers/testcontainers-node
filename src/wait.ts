import { HealthCheckWaitStrategy, Log, LogWaitStrategy, WaitStrategy } from "./wait-strategy";

export class Wait {
  public static forLogMessage(message: Log): WaitStrategy {
    return new LogWaitStrategy(message);
  }

  public static forHealthCheck(): WaitStrategy {
    return new HealthCheckWaitStrategy();
  }
}
