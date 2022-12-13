import { HealthCheckWaitStrategy, Log, LogWaitStrategy, WaitStrategy } from "./wait-strategy";
import { HttpWaitStrategy } from "./http-wait-strategy";

export class Wait {
  public static forLogMessage(message: Log | RegExp): WaitStrategy {
    return new LogWaitStrategy(message);
  }

  public static forHealthCheck(): WaitStrategy {
    return new HealthCheckWaitStrategy();
  }

  public static forHttp(path: string, port: number): HttpWaitStrategy {
    return new HttpWaitStrategy(path, port);
  }
}
