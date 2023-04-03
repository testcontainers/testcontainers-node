import { WaitStrategy } from "./wait-strategy";
import { HttpWaitStrategy } from "./http-wait-strategy";
import { HealthCheckWaitStrategy } from "./health-check-wait-strategy";
import { Log, LogWaitStrategy } from "./log-wait-strategy";

export class Wait {
  public static forLogMessage(message: Log | RegExp, times = 1): WaitStrategy {
    return new LogWaitStrategy(message, times);
  }

  public static forHealthCheck(): WaitStrategy {
    return new HealthCheckWaitStrategy();
  }

  public static forHttp(path: string, port: number): HttpWaitStrategy {
    return new HttpWaitStrategy(path, port);
  }
}
