import { WaitStrategy } from "./wait-strategy.ts";
import { HttpWaitStrategy, HttpWaitStrategyOptions } from "./http-wait-strategy.ts";
import { HealthCheckWaitStrategy } from "./health-check-wait-strategy.ts";
import { Log, LogWaitStrategy } from "./log-wait-strategy.ts";
import { ShellWaitStrategy } from "./shell-wait-strategy.ts";
import { HostPortWaitStrategy } from "./host-port-wait-strategy.ts";
import { CompositeWaitStrategy } from "./composite-wait-strategy.ts";
import { OneShotStartupCheckStrategy } from "./one-shot-startup-startegy.ts";

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

  public static forOneShotStartup(): WaitStrategy {
    return new OneShotStartupCheckStrategy();
  }

  public static forHttp(
    path: string,
    port: number,
    options: HttpWaitStrategyOptions = { abortOnContainerExit: false }
  ): HttpWaitStrategy {
    return new HttpWaitStrategy(path, port, options);
  }

  public static forSuccessfulCommand(command: string): ShellWaitStrategy {
    return new ShellWaitStrategy(command);
  }
}
