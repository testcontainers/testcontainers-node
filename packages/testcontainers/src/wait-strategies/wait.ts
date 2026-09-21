import { CompositeWaitStrategy } from "./composite-wait-strategy";
import { HealthCheckWaitStrategy } from "./health-check-wait-strategy";
import { HostPortWaitStrategy } from "./host-port-wait-strategy";
import { HttpWaitStrategy, type HttpWaitStrategyOptions } from "./http-wait-strategy";
import { type Log, LogWaitStrategy } from "./log-wait-strategy";
import { OneShotStartupCheckStrategy } from "./one-shot-startup-startegy";
import { ShellWaitStrategy } from "./shell-wait-strategy";
import type { WaitStrategy } from "./wait-strategy";

// biome-ignore lint/complexity/noStaticOnlyClass: public API surface, kept as a class for backwards compatibility
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
