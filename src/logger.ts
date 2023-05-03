import debug, { IDebugger } from "debug";

type Message = string;

export interface Logger {
  enabled(): boolean;
  trace(message: Message): void;
  debug(message: Message): void;
  info(message: Message): void;
  warn(message: Message): void;
  error(message: Message): void;
}

class DebugLogger implements Logger {
  private readonly logger: IDebugger;

  constructor(namespace: string) {
    this.logger = debug(namespace);
  }

  public enabled(): boolean {
    return this.logger.enabled;
  }

  public trace(message: Message): void {
    this.logger(`TRACE ${message}`);
  }

  public debug(message: Message): void {
    this.logger(`DEBUG ${message}`);
  }

  public info(message: Message): void {
    this.logger(`INFO  ${message}`);
  }

  public warn(message: Message): void {
    this.logger(`WARN  ${message}`);
  }

  public error(message: Message): void {
    this.logger(`ERROR ${message}`);
  }
}

export class FakeLogger implements Logger {
  public readonly traceLogs: Message[] = [];
  public readonly debugLogs: Message[] = [];
  public readonly infoLogs: Message[] = [];
  public readonly warnLogs: Message[] = [];
  public readonly errorLogs: Message[] = [];

  public enabled(): boolean {
    return true;
  }

  public trace(message: Message): void {
    this.traceLogs.push(message);
  }

  public debug(message: Message): void {
    this.debugLogs.push(message);
  }

  public info(message: Message): void {
    this.infoLogs.push(message);
  }

  public warn(message: Message): void {
    this.warnLogs.push(message);
  }

  public error(message: Message): void {
    this.errorLogs.push(message);
  }
}

export function createContainerLogger(containerName: string) {
  return new DebugLogger(`testcontainers:container:${containerName}`);
}

export const log = new DebugLogger("testcontainers");
export const containerLog = new DebugLogger("testcontainers:containers");
export const execLog = new DebugLogger("testcontainers:exec");
