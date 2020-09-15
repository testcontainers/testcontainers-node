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
    this.logger(`INFO ${message}`);
  }

  public warn(message: Message): void {
    this.logger(`WARN ${message}`);
  }

  public error(message: Message): void {
    this.logger(`ERROR ${message}`);
  }
}

export const log = new DebugLogger("testcontainers");
export const containerLog = new DebugLogger("testcontainers:containers");
