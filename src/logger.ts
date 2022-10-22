import debug, { IDebugger } from "debug";

type Message = string;

export interface Logger {
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

export const log = new DebugLogger("testcontainers");
export const containerLog = new DebugLogger("testcontainers:containers");
export const execLog = new DebugLogger("testcontainers:exec");
