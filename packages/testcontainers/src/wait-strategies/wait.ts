import { WaitStrategy } from "./wait-strategy";
import { HttpWaitStrategy } from "./http-wait-strategy";
import { HealthCheckWaitStrategy } from "./health-check-wait-strategy";
import { Log, LogWaitStrategy } from "./log-wait-strategy";
import { ShellWaitStrategy } from "./shell-wait-strategy";
import { HostPortWaitStrategy } from "./host-port-wait-strategy";
import { CompositeWaitStrategy } from "./composite-wait-strategy";

export class Wait {
  public static forAll(waitStrategies: WaitStrategy[]): CompositeWaitStrategy {
    return new CompositeWaitStrategy(waitStrategies);
  }

  public static forListeningPorts(): WaitStrategy {
    return new HostPortWaitStrategy();
  }

  public static forLogMessage(message: Log | RegExp, times = 1): WaitStrategy {
    return new LogWaitStrategy(message, times);
  }

  public static forHealthCheck(): WaitStrategy {
    return new HealthCheckWaitStrategy();
  }

  public static forHttp(path: string, port: number, failOnExitedContainer = false): HttpWaitStrategy {
    return new HttpWaitStrategy(path, port, failOnExitedContainer);
  }

  public static forSuccessfulCommand(command: string): ShellWaitStrategy {
    return new ShellWaitStrategy(command);
  }
}
